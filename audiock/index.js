
'use strict';
let audioBuffer;
let processedAudio;

let wavesurfer_arr = []

function makeElement(elementType, attrs){
	const elem = document.createElement(elementType);
	for (const [key, value] of Object.entries(attrs)){
		elem.setAttribute(key, value);
	}
	return elem;
}

function makeTableRowElement(row, elementType, attrs){
	const elem = makeElement(elementType, attrs);
	row.appendChild(elem);
	return elem;
}

function createAudioRow(obj, audioid, audiostart, audioend) {
	let tableRow = document.createElement("tr");
	tableRow.setAttribute("id", audioid);
	tableRow.setAttribute("class", "w3-hover-text-green");

	makeTableRowElement(tableRow, "td", {"id": audioid+1, "innerText": Math.round(1000*audiostart)})
	makeTableRowElement(tableRow, "td", {"id": audioid+2, "innerText": Math.round(1000*audioend)});

	let actionsArray = [
		{"action":"Play", "iconClass":"material-symbols--play-circle-rounded", "func": playRegion},
		{"action":"Delete", "iconClass":"material-symbols--delete-rounded", "func": deleteRegion}
	];

	for(let i = 0; i < actionsArray.length; i += 1) {
		const dataIcon = makeElement("button", {
			"title": actionsArray[i].action,
			"class": actionsArray[i].iconClass+" w3-button w3-black w3-border w3-border-light-green w3-round-large",
			"id": audioid+"-"+actionsArray[i].iconClass,
			// "onClick": `${actionsArray[i].func}('${audioid}')`
		});
		dataIcon.addEventListener("click", () => { actionsArray[i].func(obj, audioid); });
		const tableElem = makeTableRowElement(tableRow, "td", {"id": audioid+"-"+actionsArray[i].action});
		tableElem.appendChild(dataIcon);
	}
	return tableRow;
}

function playRegion(obj, regionId) {
	obj.wavesurfer.regions.list[regionId].play();
}

function deleteRegion(obj, regionId) {
	let track = document.getElementById(regionId);
	track.parentNode.removeChild(track);
	obj.wavesurfer.regions.list[regionId].remove();
}

// function setPlayButton() {
// 	let icon = document.getElementById("play-pause-icon");
// 	icon.className = "material-symbols--play-circle-rounded";
// };

function playAndPause(obj) {
	// let icon = document.getElementById("play-pause-icon");
	if(obj.playing === false){
		obj.playing = true;
		// icon.className = "material-symbols--pause-circle-rounded";
		obj.wavesurfer.play();
	}
	else {
		obj.playing = false;
		// icon.className = "material-symbols--play-circle-rounded";
		obj.wavesurfer.pause();
	}
}

async function readAndDecodeAudio(audioPath) {
	audioBuffer = await new Promise((resolve, reject) => {
		const request = new XMLHttpRequest();
		request.open("GET", audioPath, true);
		request.responseType = "arraybuffer";
		request.onload = () => resolve(request.response);
		request.onerror = (e) => reject(e);
		request.send();
	})
	.then((results) => {
		return new AudioContext().decodeAudioData(results);
	})
	.catch((error) => { console.log(error); });
}

function onChangeAudioSelect() {
	let element = document.getElementById("sound-select");
	let audioPath = "../sounds/" + element.value;
	let obj = {playing: false, name: element.value};
	obj.wavesurfer = WaveSurfer.create({
		container: "#waveform",
		waveColor: '#b6c3b1',
		progressColor: '#6d8764',
		responsive: true,
		barWidth: 3,
		barRadius: 3,
		cursorWidth: 1,
		height: 100,
		barGap: 3
	});
	obj.wavesurfer.on('ready', function() {
		readAndDecodeAudio(audioPath);
		// setPlayButton();
		let audioTracks = document.getElementById("audio-tracks");
		let tbody = document.createElement("tbody");
		// audioTracks.tBodies[0].remove();
		audioTracks.insertBefore(tbody, audioTracks.tFoot[0]);
		document.getElementById('time-total').innerText = obj.wavesurfer.getDuration().toFixed(1);
		obj.wavesurfer.enableDragSelection({});
	});
	obj.wavesurfer.on('finish', () => { obj.playing = false; });
	obj.wavesurfer.load(audioPath);
	obj.wavesurfer.on('audioprocess', function() {
		if(obj.wavesurfer.isPlaying()) {
			let currentTime = obj.wavesurfer.getCurrentTime();
			document.getElementById('time-current').innerText = currentTime.toFixed(1);
		}
	});
	obj.wavesurfer.on('region-created', function(newRegion) {
		newRegion.element.children[0].style.width='6px';
		newRegion.element.children[1].style.width='6px';
		let audioTracks = document.getElementById("audio-tracks").tBodies[0];
		let tableRow = createAudioRow(obj, newRegion.id, newRegion.start, newRegion.end);
		tableRow.dataset.soundname = obj.name;
		audioTracks.appendChild(tableRow);
	});
	obj.wavesurfer.on('region-update-end', function(newRegion) {
		document.getElementById(newRegion.id+1).innerText = Math.round(1000 * Math.max(0, newRegion.start));
		document.getElementById(newRegion.id+2).innerText = Math.round(1000 * Math.min(obj.wavesurfer.getDuration(), newRegion.end));
	});
	let audioButtons = document.getElementById("audio-buttons");
	let audioButtonsClass = audioButtons.getAttribute("class").replace("w3-hide","w3-show");
	audioButtons.setAttribute("class",audioButtonsClass);

	wavesurfer_arr.push(obj);

	const foo = document.getElementById("audio-buttons");
	const button = makeElement("button", {
		class: "w3-button w3-border w3-border-green w3-round-xlarge",
	});
	button.addEventListener("click", () => { playAndPause(obj); });
	button.textContent = "PLAY / PAUSE";
	foo.append(button);
}

function copy_to_clipboard()
{
	let output = "!tts ";
	// const a = document.getElementById("audio-tracks").children[2];
	const a = document.querySelector("#audio-tracks > tbody")
	for(const b of a.childNodes) {
		output += `-ck${b.childNodes[0].textContent}:`;
		output += `${b.childNodes[1].textContent} `;
		output += `-${b.dataset.soundname.replace(".mp3", "")} `
	}

	navigator.clipboard.writeText(output);
}