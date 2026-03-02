use serde::{Deserialize, Serialize};
use tauri::{
  tray::{TrayIconBuilder, TrayIconEvent},
  Emitter, LogicalSize, Manager, PhysicalPosition, Position, Size,
};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct OverlayDefaults {
  camera_size: f64,
  border_radius: f64,
  border_width: f64,
  border_color: String,
  shadow_blur: f64,
  shadow_opacity: f64,
  click_through: bool,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct OverlayStyle {
  camera_size: Option<f64>,
  border_radius: Option<f64>,
  border_width: Option<f64>,
  border_color: Option<String>,
  shadow_blur: Option<f64>,
  shadow_opacity: Option<f64>,
  click_through: Option<bool>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct OverlayPosition {
  x: i32,
  y: i32,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct OverlayPositionInput {
  x: i32,
  y: i32,
}

fn overlay_defaults() -> OverlayDefaults {
  OverlayDefaults {
    camera_size: 280.0,
    border_radius: 140.0,
    border_width: 2.0,
    border_color: "#ffffff".to_string(),
    shadow_blur: 20.0,
    shadow_opacity: 0.45,
    click_through: false,
  }
}

fn merged_style(style: &OverlayStyle) -> OverlayDefaults {
  let defaults = overlay_defaults();
  OverlayDefaults {
    camera_size: style.camera_size.unwrap_or(defaults.camera_size),
    border_radius: style.border_radius.unwrap_or(defaults.border_radius),
    border_width: style.border_width.unwrap_or(defaults.border_width),
    border_color: style.border_color.clone().unwrap_or(defaults.border_color),
    shadow_blur: style.shadow_blur.unwrap_or(defaults.shadow_blur),
    shadow_opacity: style.shadow_opacity.unwrap_or(defaults.shadow_opacity),
    click_through: style.click_through.unwrap_or(defaults.click_through),
  }
}

fn overlay_window_metrics(style: &OverlayDefaults) -> (f64, f64) {
  let shadow_offset_y: f64 = 12.0;
  let padding = (style.shadow_blur + style.border_width + shadow_offset_y.abs() + 2.0).ceil().max(10.0);
  let width = style.camera_size + padding * 2.0;
  let height = style.camera_size + padding * 2.0;
  (width, height)
}

fn clamp_position_to_monitor(
  camera: &tauri::WebviewWindow,
  x: i32,
  y: i32,
  target_width_px: i32,
  target_height_px: i32,
) -> (i32, i32) {
  if let Ok(Some(monitor)) = camera.current_monitor() {
    let monitor_pos = monitor.position();
    let monitor_size = monitor.size();

    let min_x = monitor_pos.x;
    let min_y = monitor_pos.y;
    let max_x = (monitor_pos.x + monitor_size.width as i32 - target_width_px).max(min_x);
    let max_y = (monitor_pos.y + monitor_size.height as i32 - target_height_px).max(min_y);

    return (x.clamp(min_x, max_x), y.clamp(min_y, max_y));
  }

  (x, y)
}

#[tauri::command]
fn get_overlay_defaults() -> OverlayDefaults {
  overlay_defaults()
}

#[tauri::command]
fn update_overlay_style(app: tauri::AppHandle, style: OverlayStyle) -> Result<(), String> {
  let Some(camera) = app.get_webview_window("camera") else {
    return Ok(());
  };

  let merged = merged_style(&style);
  let (width, height) = overlay_window_metrics(&merged);

  if let (Ok(pos), Ok(size)) = (camera.outer_position(), camera.outer_size()) {
    let center_x = f64::from(pos.x) + f64::from(size.width) / 2.0;
    let center_y = f64::from(pos.y) + f64::from(size.height) / 2.0;

    let scale_factor = camera.scale_factor().unwrap_or(1.0);
    let target_width_px = (width * scale_factor).round() as i32;
    let target_height_px = (height * scale_factor).round() as i32;

    let mut new_x = (center_x - f64::from(target_width_px) / 2.0).round() as i32;
    let mut new_y = (center_y - f64::from(target_height_px) / 2.0).round() as i32;

    (new_x, new_y) = clamp_position_to_monitor(&camera, new_x, new_y, target_width_px, target_height_px);

    let _ = camera.set_position(Position::Physical(PhysicalPosition::new(new_x, new_y)));
  }

  let _ = camera.set_size(Size::Logical(LogicalSize::new(width, height)));
  let _ = camera.set_ignore_cursor_events(merged.click_through);

  let payload = serde_json::json!({
    "cameraSize": merged.camera_size,
    "borderRadius": merged.border_radius,
    "borderWidth": merged.border_width,
    "borderColor": merged.border_color,
    "shadowBlur": merged.shadow_blur,
    "shadowOpacity": merged.shadow_opacity,
    "clickThrough": merged.click_through,
    "cameraWidth": merged.camera_size,
    "cameraHeight": merged.camera_size
  });

  camera
    .emit("overlay:apply-style", payload)
    .map_err(|error| error.to_string())?;

  Ok(())
}

#[tauri::command]
fn get_overlay_position(app: tauri::AppHandle) -> Result<Option<OverlayPosition>, String> {
  let Some(camera) = app.get_webview_window("camera") else {
    return Ok(None);
  };

  let pos = camera.outer_position().map_err(|error| error.to_string())?;
  Ok(Some(OverlayPosition { x: pos.x, y: pos.y }))
}

#[tauri::command]
fn set_overlay_position(app: tauri::AppHandle, position: OverlayPositionInput) -> Result<(), String> {
  let Some(camera) = app.get_webview_window("camera") else {
    return Ok(());
  };

  let size = camera.outer_size().map_err(|error| error.to_string())?;
  let (x, y) = clamp_position_to_monitor(
    &camera,
    position.x,
    position.y,
    size.width as i32,
    size.height as i32,
  );

  camera
    .set_position(Position::Physical(PhysicalPosition::new(x, y)))
    .map_err(|error| error.to_string())?;

  Ok(())
}

#[tauri::command]
fn toggle_overlay_visible(app: tauri::AppHandle, visible: bool) -> Result<(), String> {
  let Some(camera) = app.get_webview_window("camera") else {
    return Ok(());
  };

  if visible {
    camera.show().map_err(|error| error.to_string())?;
    camera.set_focus().map_err(|error| error.to_string())?;
  } else {
    camera.hide().map_err(|error| error.to_string())?;
  }

  Ok(())
}

#[tauri::command]
fn toggle_frame_visible(app: tauri::AppHandle, visible: bool) -> Result<(), String> {
  let Some(frame) = app.get_webview_window("frame") else { return Ok(()); };
  if visible {
    frame.show().map_err(|e| e.to_string())?;
    frame.set_focus().map_err(|e| e.to_string())?;
  } else {
    frame.hide().map_err(|e| e.to_string())?;
  }
  Ok(())
}

#[tauri::command]
fn set_frame_size(app: tauri::AppHandle, width: u32, height: u32) -> Result<(), String> {
  let Some(frame) = app.get_webview_window("frame") else { return Ok(()); };
  frame.set_size(Size::Logical(LogicalSize::new(width as f64, height as f64)))
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn set_frame_click_through(app: tauri::AppHandle, enable: bool) -> Result<(), String> {
  let Some(frame) = app.get_webview_window("frame") else { return Ok(()); };
  frame.set_ignore_cursor_events(enable).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_camera_device(app: tauri::AppHandle, device_id: String) -> Result<(), String> {
  if let Some(camera) = app.get_webview_window("camera") {
    camera.emit("camera:select-device", &device_id).map_err(|e| e.to_string())?;
  }
  Ok(())
}

#[tauri::command]
fn control_hide(app: tauri::AppHandle) -> Result<(), String> {
  if let Some(control) = app.get_webview_window("control") {
    control.hide().map_err(|error| error.to_string())?;
  }
  Ok(())
}

#[tauri::command]
fn control_show(app: tauri::AppHandle) -> Result<(), String> {
  if let Some(control) = app.get_webview_window("control") {
    control.show().map_err(|error| error.to_string())?;
    control.set_focus().map_err(|error| error.to_string())?;
  }
  Ok(())
}

fn setup_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
  TrayIconBuilder::new()
    .icon(app.default_window_icon().cloned().unwrap())
    .on_tray_icon_event({
      let app = app.clone();
      move |_tray, event| {
        if let TrayIconEvent::Click { button, button_state, .. } = event {
          if button == tauri::tray::MouseButton::Left && button_state == tauri::tray::MouseButtonState::Up {
            if let Some(control) = app.get_webview_window("control") {
              let _ = control.show();
              let _ = control.set_focus();
            } else {
              let _ = tauri::WebviewWindowBuilder::new(
                &app,
                "control",
                tauri::WebviewUrl::App("control.html".into()),
              )
              .title("CamShadow 控制中心")
              .inner_size(860.0, 640.0)
              .min_inner_size(820.0, 620.0)
              .resizable(true)
              .center()
              .build();
            }
          }
        }
      }
    })
    .build(app)?;

  Ok(())
}

fn main() {
  tauri::Builder::default()
    .setup(|app| {
      setup_tray(app.handle())?;
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      get_overlay_defaults,
      update_overlay_style,
      get_overlay_position,
      set_overlay_position,
      toggle_overlay_visible,
      toggle_frame_visible,
      set_frame_size,
      set_frame_click_through,
      set_camera_device,
      control_hide,
      control_show
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
