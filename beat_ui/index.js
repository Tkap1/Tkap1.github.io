
const e_ui = {
	nothing: 0,
	hover: 1,
	press: 2,
	active: 3,
	cancel: 4,
};

document.querySelector("#app").innerHTML = `<canvas id="canvas"></canvas>`;
const canvas = document.querySelector("#canvas");
const ctx = canvas.getContext("2d");
const active_columns = 16;
const selected = [];
const max_columns = 1024;
const file_paths = ["../hihat_closed.mp3", "../hihat_opened.mp3", "../clap.mp3", "../kick.mp3"];
const ui = {
	hover: 0,
	press: 0,
};
let mouse_count = 0;
let mouse_down = 0;
let mouse_x = 0;
let mouse_y = 0;
let slider_percent = 0.25;
let playing = false;
let start_timestamp = 0;
let first_frame = true;
let curr_column = 0;
let last_timestamp = 0

function init()
{
	canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

	document.addEventListener("mouseup", on_mouse_up);
	document.addEventListener("mousemove", on_mouse_move);
	document.addEventListener("mousedown", on_mouse_down);
	window.addEventListener("resize", on_window_resize);

	for(let i = 0; i < max_columns; i += 1) {
		selected[i] = [false, false, false, false];
	}

	requestAnimationFrame(frame);
}

function frame(timestamp)
{
	delta = (timestamp - last_timestamp) / 1000.0;
	last_timestamp = timestamp;
	if(first_frame) {
		first_frame = false;
		start_timestamp = timestamp;
	}
	ctx.fillStyle = "#111111";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	const names = ["Closed HH", "Open HH", "Clap", "Kick"];
	const rect_size = 48;
	const font_size = 30;

	ctx.font = `${font_size}px Arial`;

	let bpm = range_lerp(slider_percent, 0, 1, 20, 1000);
	bpm = Math.round(bpm / 5) * 5;

	// vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv		bpm slider start		vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
	{
		const slider_x = 250;
		const slider_y = 20;
		const slider_width = 700;
		const slider_height = 32;

		const result = ui_button("bpm_slider", slider_x - 10, slider_y, slider_width + 20, slider_height);
		if(result == e_ui.press) {
			slider_percent = ilerp(slider_x, slider_x + slider_width, mouse_x);
			slider_percent = clamp(slider_percent, 0, 1);
		}

		ctx.fillStyle = map_ui_to_color(["#5D5A53", "#7D7A73", "#3D3A33"], result);
		ctx.fillRect(slider_x, slider_y, slider_width, slider_height);
		ctx.fillStyle = "#5D5A53";
		ctx.fillText(`BPM ${bpm}`, 10, slider_y + slider_height / 2 + font_size / 2);
		ctx.fillStyle = map_ui_to_color(["#C48559", "#E4A579", "#A46539"], result);
		ctx.fillRect(slider_x + lerp(0, slider_width - 32, slider_percent), slider_y, 32, slider_height);
	}
	// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^		bpm slider end		^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

	// vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv		play button start		vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
	{
		const x = 100;
		const y = 100;
		const rect_size = 48;
		const result = ui_button("play", x, y, rect_size, rect_size);
		ctx.fillStyle = map_ui_to_color(["#5D5A53", "#9D9A93", "#2D2A23"], result);
		ctx.fillRect(x, y, rect_size, rect_size);

		ctx.fillStyle = "#5D5A53";
		ctx.fillText("Play", 10, y + font_size / 2 + rect_size / 2);

		if(result === e_ui.active) {
			playing = !playing;
			play_time = 0;
			curr_column = 0;
			if(playing) {
				play_column(curr_column);
			}
		}
	}
	// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^		play button end		^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

	const delay = 1.0 / (bpm * 4 / 60);
	if(playing) {
		play_time += delta;
		if(play_time >= delay) {
			play_time -= delay;
			curr_column += 1;
			curr_column %= active_columns;
			play_column(curr_column);
		}
	}

	{
		const start_x = 250;
		const start_y = 200;

		// vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv		play cursor start		vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
		// if(playing) {
		// 	const end_x = start_x + (active_columns - 1) * (rect_size + 16);
		// 	const percent = curr_column / (active_columns);
		// 	let x = lerp(start_x, end_x, percent);
		// 	x += (play_time / delay) * (rect_size + 16);
		// 	ctx.fillStyle = "#59AD34";
		// 	ctx.fillRect(x, start_y - 32, rect_size, rect_size * 4 + 64 + 48);
		// }
		// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^		play cursor end		^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

		for(let column_i = 0; column_i < active_columns; column_i += 1) {
			const color_mod = Math.floor(column_i / 4) % 2;
			for(let i = 0; i < 4; i += 1) {
				const x = start_x + (rect_size + 16) * column_i;
				const y = start_y + i * (rect_size + 16);

				let color_arr = [rgb(0.365, 0.353, 0.325), rgb(0.992, 0.855, 0.639), rgb(0.176, 0.165, 0.137)];
				if(selected[column_i][i]) {
					color_arr = [rgb(0.173, 0.357, 0.220), rgb(0.298, 0.482, 0.345), rgb(0.059, 0.231, 0.094)];
				}
				let color_multiplier = 1.0;
				if(color_mod == 1) {
					color_multiplier *= 0.5;
				}
				if(curr_column == column_i && playing) {
					color_multiplier *= 3.0;
				}

				for(let color_i = 0; color_i < color_arr.length; color_i += 1) {
					multiply_color(color_arr[color_i], color_multiplier);
				}

				const result = ui_button(`sound${column_i}${i}`, x, y, rect_size, rect_size);
				ctx.fillStyle = rgb_to_hex_str(map_ui_to_color(color_arr, result));
				ctx.fillRect(x, y, rect_size, rect_size);

				if(result === e_ui.active) {
					selected[column_i][i] = !selected[column_i][i];
					if(!playing && selected[column_i][i]) {
						var audio = new Audio(file_paths[i]);
						audio.play();
					}
				}

				if(column_i === 0) {
					ctx.fillStyle = "#5D5A53";
					ctx.fillText(names[i], 10, start_y + i * (rect_size + 16) + rect_size / 2 + font_size / 2);
				}
			}
		}

	}

	// vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv		export button start		vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
	{
		const x = 300;
		const y = 500;
		const rect_size = 48;

		const result = ui_button("copy to clipboard", x, y, rect_size, rect_size);
		ctx.fillStyle = map_ui_to_color(["#5D5A53", "#9D9A93", "#2D2A23"], result);
		ctx.fillRect(x, y, rect_size, rect_size);

		ctx.fillStyle = "#5D5A53";
		ctx.fillText("Copy to clipboard", 10, y + font_size / 2 + rect_size / 2);
		ctx.fillText("Paste into twitch chat!", 10, y + 200);

		if(result === e_ui.active) {
			copy_loop_to_clipboard(bpm);
		}
	}
	// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^		export button end		^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

	mouse_count = 0;
	requestAnimationFrame(frame);
}

function is_mouse_pressed()
{
	return (mouse_down && mouse_count === 1) || mouse_count > 1;
}

function is_mouse_released()
{
	return (!mouse_down && mouse_count === 1) || mouse_count > 1;
}

function is_mouse_down()
{
	return mouse_down;
}

function is_mouse_up()
{
	return !mouse_down;
}

function on_mouse_down(e)
{
	mouse_x = e.clientX;
	mouse_y = e.clientY;
	mouse_down = true;
	mouse_count += 1;
}

function on_mouse_up(e)
{
	mouse_x = e.clientX;
	mouse_y = e.clientY;
	mouse_down = false;
	mouse_count += 1;
}

function on_mouse_move(e)
{
	mouse_x = e.clientX;
	mouse_y = e.clientY;
}

function on_window_resize()
{
	canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function mouse_collides_rect(x, y, sx, sy)
{
	return mouse_x > x && mouse_x < x + sx &&
		mouse_y > y && mouse_y < y + sy;
}

function lerp(a, b, dt)
{
	return a + (b - a) * dt;
}

function ilerp(a, b, c)
{
	return (c - a) / (b - a);
}


function clamp(current, min, max)
{
	return Math.max(Math.min(max, current), min);
}

function range_lerp(current, amin, amax, bmin, bmax)
{
	const p = ilerp(amin, amax, current);
	return lerp(bmin, bmax, p);
}

function get_seconds(timestamp)
{
	return (timestamp - start_timestamp) / 1000.0;
}

function play_column(column)
{
	for(let i = 0; i < 4; i += 1) {
		if(selected[column][i]) {
			var audio = new Audio(file_paths[i]);
			audio.play();
		}
	}
}

function copy_loop_to_clipboard(bpm)
{
	let text = `!beat 1 ${bpm} `;
	for(let column_i = 0; column_i < active_columns; column_i += 1) {
		for(let i = 0; i < 4; i += 1) {
			if(selected[column_i][i]) {
				text += `${i + 1}`;
			}
		}
		if(column_i < active_columns - 1) {
			text += "-";
		}
	}
	navigator.clipboard.writeText(text);
}

function hash(text)
{
	let hash = 5381;
	for(let i = 0; i < text.length; i += 1) {
		const c = text.charCodeAt(i);
		hash = ((hash << 5) + hash) + c;
	}
	return hash;
}

function ui_request_hover(id)
{
	if(ui.press !== 0) { return; }
	ui.hover = id;
}

function ui_request_press(id)
{
	ui.hover = 0;
	ui.press = id;
}

function ui_button(text, x, y, size_x, size_y)
{
	let result = e_ui.nothing;
	const id = hash(text);
	const hovered = mouse_collides_rect(x, y, size_x, size_y);
	if(hovered) {
		ui_request_hover(id);
	}
	if(ui.hover === id) {
		result = e_ui.hover;
		if(hovered) {
			if(is_mouse_pressed()) {
				ui_request_press(id);
			}
		}
		else {
			ui_request_hover(0);
		}
	}
	if(ui.press === id) {
		result = e_ui.press;
		if(is_mouse_released()) {
			if(hovered) {
				result = e_ui.active;
			}
			else {
				result = e_ui.cancel;
			}
			ui_request_press(0);
		}
	}
	return result;
}

function map_ui_to_color(arr, ui_state)
{
	if(ui_state === e_ui.hover) {
		return arr[1];
	}
	if(ui_state === e_ui.press) {
		return arr[2];
	}
	return arr[0];
}

function rgb_to_hex_str(rgb)
{
	const r = rgb.r * 255;
	const g = rgb.g * 255;
	const b = rgb.b * 255;
	const val = r << 16 | g << 8 | b;
	return "#" + val.toString(16);
}

function multiply_color(rgb, mul)
{
	rgb.r = clamp(rgb.r * mul, 0, 1);
	rgb.g = clamp(rgb.g * mul, 0, 1);
	rgb.b = clamp(rgb.b * mul, 0, 1);
	return rgb;
}

function rgb(r, g, b)
{
	return {r: r, g: g, b: b}
}

init();

