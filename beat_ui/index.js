
document.querySelector("#app").innerHTML = `<canvas id="canvas"></canvas>`;
const canvas = document.querySelector("#canvas");
const ctx = canvas.getContext("2d");
const active_columns = 16;
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
const selected = [];
const max_columns = 1024;
const file_paths = ["../hihat_closed.mp3", "../hihat_opened.mp3", "../clap.mp3", "../kick.mp3"];

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
	delta = (timestamp - last_timestamp) / 1000.0
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

		const hovered = mouse_collides_rect(slider_x - 10, slider_y, slider_width + 20, slider_height);
		if(hovered && is_mouse_down()) {
			slider_percent = ilerp(slider_x, slider_x + slider_width, mouse_x);
			slider_percent = clamp(slider_percent, 0, 1);
		}

		ctx.fillStyle = "#5D5A53";
		ctx.fillRect(slider_x, slider_y, slider_width, slider_height);
		ctx.fillText(`BPM ${bpm}`, 10, slider_y + slider_height / 2 + font_size / 2);
		ctx.fillStyle = "#C48559";
		ctx.fillRect(250 + lerp(0, slider_width - 32, slider_percent), slider_y, 32, slider_height);
	}
	// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^		bpm slider end		^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

	// vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv		play button start		vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
	{
		const x = 100;
		const y = 100;
		const rect_size = 48;
		const hovered = mouse_collides_rect(x, y, rect_size, rect_size);
		ctx.fillStyle = "#5D5A53";
		ctx.fillRect(x, y, rect_size, rect_size);
		ctx.fillText("Play", 10, y + font_size / 2 + rect_size / 2);
		if(hovered && is_mouse_pressed()) {
			playing = !playing;
			play_time = 0;
			curr_column = 0;
			if(playing) {
				play_column(curr_column);
			}
		}
	}
	// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^		play button end		^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

	const delay = 1.0 / (bpm / 60);
	if(playing) {
		play_time += delta;
		if(play_time >= delay) {
			play_time -= delay;
			curr_column += 1;
			curr_column %= active_columns;
			play_column(curr_column);
		}
	}

	const start_y = 200;
	for(let column_i = 0; column_i < active_columns; column_i += 1) {
		for(let i = 0; i < 4; i += 1) {
			const x = 250 + (rect_size + 16) * column_i;
			const y = start_y + i * (rect_size + 16);
			ctx.fillStyle = "#5D5A53";
			const hovered = mouse_collides_rect(x, y, rect_size, rect_size);
			if(hovered) {
				ctx.fillStyle = "#FDDAA3"
			}
			else if(selected[column_i][i]) {
				ctx.fillStyle = "#2C5B38";
			}
			if(hovered && is_mouse_pressed()) {
				selected[column_i][i] = !selected[column_i][i];
				var audio = new Audio(file_paths[i]);
				audio.play();
			}
			ctx.fillRect(x, y, rect_size, rect_size);

			if(column_i == 0) {
				ctx.fillStyle = "#5D5A53";
				ctx.fillText(names[i], 10, start_y + i * (rect_size + 16) + rect_size / 2 + font_size / 2);
			}
		}
	}

	// vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv		export button start		vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
	{
		const x = 300;
		const y = 500;
		const rect_size = 48;
		const hovered = mouse_collides_rect(x, y, rect_size, rect_size);
		ctx.fillStyle = "#5D5A53";
		ctx.fillRect(x, y, rect_size, rect_size);
		ctx.fillText("Copy to clipboard", 10, y + font_size / 2 + rect_size / 2);
		if(hovered && is_mouse_pressed()) {
			copy_loop_to_clipboard(bpm);
		}
	}
	// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^		export button end		^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

	mouse_count = 0;
	requestAnimationFrame(frame);
}

function is_mouse_pressed()
{
	return (mouse_down && mouse_count == 1) || mouse_count > 1;
}

function is_mouse_released()
{
	return (!mouse_down && mouse_count == 1) || mouse_count > 1;
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
	let text = `!beat ${bpm} `;
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

init();

