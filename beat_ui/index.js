
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
const selected = [];
const ui = {
	prev_hover: {id: 0, layer: 0},
	prev_press: {id: 0, layer: 0},
	hover: {id: 0, layer: 0},
	press: {id: 0, layer: 0},
};
const file_names = [];
const curr_sounds = [];
const max_rows = 8
let active_columns = 0;
let mouse_count = 0;
let mouse_down = 0;
let mouse_x = 0;
let mouse_y = 0;
let prev_mouse_x = 0;
let prev_mouse_y = 0;
let slider_percent = 0.25;
let repeat_slider = 0.2;
let playing = false;
let start_timestamp = 0;
let first_frame = true;
let curr_column = 0;
let last_timestamp = 0
let beat_scroll = 0;
let choosing_index = 0;
let choosing_sound = false;
let choosing_scroll = 0;
let wheel = 0;
let total_time = 0;
let cam_y = 0;
let visual_cam_y = 0;
let ui_id_seen_arr = [];

function init()
{
	canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

	document.addEventListener("mouseup", on_mouse_up);
	document.addEventListener("mousemove", on_mouse_move);
	document.addEventListener("mousedown", on_mouse_down);
	document.addEventListener("wheel", on_mouse_wheel);
	document.addEventListener("keydown", on_key_down);
	window.addEventListener("resize", on_window_resize);

	fetch("../list.txt")
  .then((res) => res.text())
  .then((text) => {
		let lines = text.split("\r\n");

		// @Note(tkap, 09/11/2023): Without this it works on my pc, but not on gitub. I guess the fetch keeps \r on my pc
		// but not on github??
		if(lines.length <= 1) {
			lines = text.split("\n");
		}
		for(let i = 0; i < lines.length; i += 1) {
			file_names.push(lines[i]);
		}
		curr_sounds[0] = get_sound_index_by_name("hihat_closed");
		curr_sounds[1] = get_sound_index_by_name("hihat_open");
		curr_sounds[2] = get_sound_index_by_name("clap");
		curr_sounds[3] = get_sound_index_by_name("kick");
		curr_sounds[4] = get_sound_index_by_name("pop");
		curr_sounds[5] = get_sound_index_by_name("pop2");
		curr_sounds[6] = get_sound_index_by_name("pop3");
		curr_sounds[7] = get_sound_index_by_name("fart3");
   })
  .catch((e) => console.error(e));

	add_columns();

	requestAnimationFrame(frame);
}

function frame(timestamp)
{
	delta = (timestamp - last_timestamp) / 1000.0;
	delta = Math.min(delta, 1.0);

	last_timestamp = timestamp;
	if(first_frame) {
		first_frame = false;
		start_timestamp = timestamp;
	}
	total_time += delta;

	ctx.reset();
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = "#111111";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	const rect_size = 48;
	const font_size = 30;
	const beat_padding = 16;

	visual_cam_y = lerp(visual_cam_y, cam_y, delta * 10.0);
	if(Math.abs(visual_cam_y - cam_y) < 1) {
		visual_cam_y = cam_y;
	}

	ctx.translate(0, -visual_cam_y);
	mouse_y_this_frame = mouse_y + visual_cam_y;

	ctx.font = `${font_size}px Arial`;

	let bpm = range_lerp(slider_percent, 0, 1, 20, 1000);
	bpm = Math.round(bpm / 5) * 5;

	let button_y = 20;

	// vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv		bpm slider start		vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
	{
		const slider_x = 250;
		const slider_width = 700;
		const slider_height = 32;

		const result = ui_button("bpm_slider", mouse_x, mouse_y_this_frame, slider_x - 10, button_y, slider_width + 20, slider_height, 1);
		if(result == e_ui.press) {
			slider_percent = ilerp(slider_x, slider_x + slider_width, mouse_x);
			slider_percent = clamp(slider_percent, 0, 1);
		}

		ctx.fillStyle = map_ui_to_color(["#5D5A53", "#7D7A73", "#3D3A33"], result);
		ctx.fillRect(slider_x, button_y, slider_width, slider_height);
		ctx.fillStyle = "#5D5A53";
		ctx.fillText(`BPM ${bpm}`, 10, button_y + slider_height / 2 + font_size / 2);
		ctx.fillStyle = map_ui_to_color(["#C48559", "#E4A579", "#A46539"], result);
		ctx.fillRect(slider_x + lerp(0, slider_width - 32, slider_percent), button_y, 32, slider_height);

		button_y += font_size * 1.5;
	}
	// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^		bpm slider end		^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

	let repeat_count = 0;
	// vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv		repeat slider start		vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
	{
		const slider_x = 250;
		const slider_width = 700;
		const slider_height = 32;

		const result = ui_button("repeat_slider", mouse_x, mouse_y_this_frame, slider_x - 10, button_y, slider_width + 20, slider_height, 1);
		if(result == e_ui.press) {
			repeat_slider = ilerp(slider_x, slider_x + slider_width, mouse_x);
			repeat_slider = clamp(repeat_slider, 0, 1);
		}

		repeat_count = Math.round(range_lerp(repeat_slider, 0, 1, 1, 5));

		ctx.fillStyle = map_ui_to_color(["#5D5A53", "#7D7A73", "#3D3A33"], result);
		ctx.fillRect(slider_x, button_y, slider_width, slider_height);
		ctx.fillStyle = "#5D5A53";
		ctx.fillText(`Repeats ${repeat_count}`, 10, button_y + slider_height / 2 + font_size / 2);
		ctx.fillStyle = map_ui_to_color(["#C48559", "#E4A579", "#A46539"], result);
		ctx.fillRect(slider_x + lerp(0, slider_width - 32, repeat_slider), button_y, 32, slider_height);

		button_y += font_size * 1.5;
	}
	// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^		repeat slider end		^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

	// vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv		play button start		vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
	{
		const x = 100;
		const rect_size = 48;
		const result = ui_button("play", mouse_x, mouse_y_this_frame, x, button_y, rect_size, rect_size, 1);
		ctx.fillStyle = map_ui_to_color(["#5D5A53", "#9D9A93", "#2D2A23"], result);
		ctx.fillRect(x, button_y, rect_size, rect_size);

		ctx.fillStyle = "#5D5A53";
		ctx.fillText("Play", 10, button_y + font_size / 2 + rect_size / 2);

		if(result === e_ui.active) {
			playing = !playing;
			play_time = 0;
			curr_column = 0;
			if(playing) {
				play_column(curr_column);
			}
		}
		button_y += font_size * 2.0;
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
		const start_y = button_y;

		// vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv		play cursor start		vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
		// if(playing) {
		// 	const end_x = start_x + (active_columns - 1) * (rect_size + beat_padding);
		// 	const percent = curr_column / (active_columns);
		// 	let x = lerp(start_x, end_x, percent);
		// 	x += (play_time / delay) * (rect_size + beat_padding);
		// 	ctx.fillStyle = "#59AD34";
		// 	ctx.fillRect(x, start_y - 32, rect_size, rect_size * 4 + 64 + 48);
		// }
		// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^		play cursor end		^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^


		for(let i = 0; i < max_rows; i += 1) {
			const x = 10;
			const y = start_y + i * (rect_size + beat_padding) + rect_size / 2 + font_size / 2;
			const result = ui_button("sound_name" + i, mouse_x, mouse_y_this_frame, x, y - font_size, 200, font_size * 1.5, 1);
			ctx.fillStyle = map_ui_to_color(["#5D5A53", "#7D7A73", "#2D2A23"], result);
			ctx.fillText(file_names[curr_sounds[i]], x, y);
			if(result == e_ui.active) {
				choosing_index = i;
				choosing_sound = true;
			}
		}

		ctx.save();
		ctx.rect(start_x, start_y, canvas.width - start_x, (rect_size + beat_padding) * max_rows);
		ctx.clip();

		for(let column_i = 0; column_i < active_columns; column_i += 1) {
			const color_mod = Math.floor(column_i / 4) % 2;
			for(let i = 0; i < max_rows; i += 1) {
				const x = start_x + (rect_size + beat_padding) * column_i - beat_scroll;
				const y = start_y + i * (rect_size + beat_padding);

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

				const result = ui_button(`sound${column_i}${i}`, mouse_x, mouse_y_this_frame, x, y, rect_size, rect_size, 1);
				ctx.fillStyle = rgb_to_hex_str(map_ui_to_color(color_arr, result));
				ctx.fillRect(x, y, rect_size, rect_size);

				if(result === e_ui.active) {
					selected[column_i][i] = !selected[column_i][i];
					if(!playing && selected[column_i][i]) {
						var audio = new Audio(sound_index_to_path(i));
						audio.play();
					}
				}
			}
		}

		ctx.restore();

		button_y += font_size * 18;

	}

	// vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv		add or subtract beats start		vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
	{
		const x = 300;
		const rect_size = 48;

		{
			const result = ui_button("add_beats", mouse_x, mouse_y_this_frame, x, button_y, rect_size, rect_size, 1);
			ctx.fillStyle = map_ui_to_color(["#5D5A53", "#9D9A93", "#2D2A23"], result);
			ctx.fillRect(x, button_y, rect_size, rect_size);
			ctx.fillStyle = "#5D5A53";
			ctx.fillText("Add beats", 10, button_y + font_size / 2 + rect_size / 2);

			if(result == e_ui.active) {
				add_columns();
			}
			button_y += font_size * 2.0;
		}

		{
			const result = ui_button("remove_beats", mouse_x, mouse_y_this_frame, x, button_y, rect_size, rect_size, 1);
			ctx.fillStyle = map_ui_to_color(["#5D5A53", "#9D9A93", "#2D2A23"], result);
			ctx.fillRect(x, button_y, rect_size, rect_size);
			ctx.fillStyle = "#5D5A53";
			ctx.fillText("Remove beats", 10, button_y + font_size / 2 + rect_size / 2);

			if(result == e_ui.active) {
				remove_columns();
			}
			button_y += font_size * 2.0;
		}

	}
	// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^		add or subtract beats end		^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^


	// vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv		export button start		vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
	{
		const x = 300;
		const rect_size = 48;

		const result = ui_button("copy to clipboard", mouse_x, mouse_y_this_frame, x, button_y, rect_size, rect_size, 1);
		ctx.fillStyle = map_ui_to_color(["#5D5A53", "#9D9A93", "#2D2A23"], result);
		ctx.fillRect(x, button_y, rect_size, rect_size);

		ctx.fillStyle = "#5D5A53";
		ctx.fillText("Copy to clipboard", 10, button_y + font_size / 2 + rect_size / 2);
		if(result === e_ui.active) {
			copy_loop_to_clipboard(bpm, repeat_count);
		}

		button_y += font_size * 3.5;

		ctx.fillText("Paste into twitch chat!", 10, button_y);
		button_y += font_size * 2.0;

	}
	// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^		export button end		^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

	{
		ctx.fillStyle = "#5D5A53";
		ctx.fillText("Click and hold below beat squares to scroll horizontally when beat doesn't fit on screen", 10, button_y);
		button_y += font_size * 2.0;
		ctx.fillText("Click on sound names to pick a different sound", 10, button_y);
	}

	{
		const result = ui_button("beat_scroll", mouse_x, mouse_y_this_frame, 0, 0, canvas.width, canvas.height, 0);
		if(result == e_ui.press) {
			beat_scroll -= mouse_x - prev_mouse_x;
		}
		beat_scroll = clamp(beat_scroll, 0, (rect_size + beat_padding) * (active_columns - 16));
	}

	// vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv		choosing sound start		vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
	if(choosing_sound) {
		const width = 400;
		const height = 600;
		const x = canvas.width / 2 - width / 2;
		const y = canvas.height / 2 - height / 2;
		ctx.save();
		ctx.translate(0, visual_cam_y);
		ctx.beginPath();
		ctx.rect(x, y, width, height);
		ctx.clip();
		ctx.fillStyle = "#777777";
		const result = ui_button("choosing_sound_background", mouse_x, mouse_y, x, y, width, height, 2);
		ctx.fillRect(x, y, width, height);
		choosing_scroll += wheel * 2;
		choosing_scroll = clamp(choosing_scroll, 0, file_names.length * font_size - height);
		let text_y = y - choosing_scroll;

		for(let i = 0; i < file_names.length; i += 1) {
			const result = ui_button("choosing_sound" + i, mouse_x, mouse_y, x + 10, text_y, width, font_size * 1.5, 3);
			ctx.fillStyle = map_ui_to_color(["#56ADC8", "#76CDE8", "#368DA8"], result);
			ctx.fillText(file_names[i], x + 10, text_y + font_size);
			if(result == e_ui.active) {
				curr_sounds[choosing_index] = i;
				choosing_sound = false;
			}
			text_y += font_size;
		}
		ctx.restore();
	}
	// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^		choosing sound end		^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
	else {
		cam_y += wheel * 0.2;
	}

	if(ui.hover.id != 0 && !ui_id_seen_arr.includes(ui.hover.id)) {
		ui.hover.id = 0;
		ui.hover.layer = 0;
	}
	if(ui.press.id != 0 && !ui_id_seen_arr.includes(ui.press.id)) {
		ui.press.id = 0;
		ui.press.layer = 0;
	}
	ui_id_seen_arr = [];

	ui.prev_hover = {...ui.hover};
	ui.prev_press = {...ui.press};

	prev_mouse_x = mouse_x;
	prev_mouse_y = mouse_y;

	mouse_count = 0;
	wheel = 0;
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
	if(e.button === 0) {
		mouse_x = e.clientX;
		mouse_y = e.clientY;
		mouse_down = true;
		mouse_count += 1;
	}
}

function on_mouse_up(e)
{
	if(e.button === 0) {
		mouse_x = e.clientX;
		mouse_y = e.clientY;
		mouse_down = false;
		mouse_count += 1;
	}
}

function on_mouse_move(e)
{
	mouse_x = e.clientX;
	mouse_y = e.clientY;
}

function on_mouse_wheel(e)
{
	wheel += e.deltaY;
}

function on_key_down(e)
{
	if(e.key === "Escape") {
		choosing_sound = false;
	}
}

function on_window_resize()
{
	canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function mouse_collides_rect(mx, my, x, y, sx, sy)
{
	return mx > x && mx < x + sx &&
		my > y && my < y + sy;
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
	for(let i = 0; i < max_rows; i += 1) {
		if(selected[column][i]) {
			var audio = new Audio(sound_index_to_path(i));
			audio.play();
		}
	}
}

function copy_loop_to_clipboard(bpm, repeat_count)
{
	let text = `!beat ${repeat_count} ${bpm} `;
	for(let i = 0; i < max_rows; i += 1) {
		text += `${file_names[curr_sounds[i]]}`;
		if(i < max_rows - 1) {
			text += ",";
		}
		else {
			text += " ";
		}
	}
	for(let column_i = 0; column_i < active_columns; column_i += 1) {
		for(let i = 0; i < max_rows; i += 1) {
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

function ui_request_hover(id, layer)
{
	if(ui.press.id !== 0) { return; }
	if(ui.hover.id !== 0 && ui.hover.layer > layer) { return; }
	ui.hover.id = id;
	ui.hover.layer = layer;
}

function ui_request_press(id, layer)
{
	if(id !== 0 && ui.press.id !== 0) { return; }
	ui.hover.id = 0;
	ui.press.id = id;
	ui.press.layer = layer;
}

function ui_button(text, mx, my, x, y, size_x, size_y, layer = 0)
{
	let result = e_ui.nothing;
	const id = hash(text);
	ui_id_seen_arr.push(id);
	const hovered = mouse_collides_rect(mx, my, x, y, size_x, size_y);
	if(hovered) {
		ui_request_hover(id, layer);
	}
	if(ui.prev_hover.id === id) {
		result = e_ui.hover;
		if(hovered) {
			if(is_mouse_pressed()) {
				ui_request_press(id, layer);
			}
		}
		else {
			ui_request_hover(0, layer);
		}
	}
	if(ui.prev_press.id === id) {
		result = e_ui.press;
		if(is_mouse_released()) {
			if(hovered) {
				result = e_ui.active;
			}
			else {
				result = e_ui.cancel;
			}
			ui_request_press(0, layer);
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

function add_columns()
{
	new_value = active_columns + 16;
	for(let i = active_columns; i < new_value; i += 1) {
		selected[i] = [false, false, false, false];
	}
	active_columns = new_value;
}

function remove_columns()
{
	if(active_columns > 16) {
		active_columns -= 16;
	}
}

function get_sound_index_by_name(name)
{
	for(let i = 0; i < file_names.length; i += 1) {
		if(name === file_names[i]) {
			return i;
		}
	}
	console.assert(false);
}

function sound_index_to_path(index)
{
	console.assert(index >= 0 && index < max_rows);
	return "../" + file_names[curr_sounds[index]] + ".mp3";
}

init();

