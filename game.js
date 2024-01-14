import {settings} from "./index.js";
// Constants
const MAX_SPEED = 20;
// State variables
export const highScores = new Proxy(JSON.parse(localStorage.getItem("frozenHighScores")) ?? {}, {
	set: function (target, property, value) {
		console.log(`${property} has been set to ${value}`);
		const valid = Reflect.set(...arguments);
		localStorage.setItem("frozenHighScores", JSON.stringify(target));
		return valid;
	}
});
export const game = {
	changed: true
};
const heldKeys = new Set();
let character = null;
let endGameText = null;
let speed = 0;
// Scoring
let startTime = 0;
let time = 0;
// Character class
class Character {
	constructor (x, y, rotation) {
		game.changed = true;
		this.x = x ?? 0;
		this.y = y ?? 0;
		this.rotation = rotation ?? 0;
		this.fill();
	}
	clear() {
		this.fill();
	}
	fill() {
		// TODO
	}
	rotate(dr) {
		this.rotation = (this.rotation + dr) % 360;
	}
	translate(dx) {
		this.x + dx;
	}
	update(offset, rOffset = 0) {
		if (false /* collisionCheck(this) */) {
			return false;
		}
		game.changed = true;
		this.translate(offset);
		this.rotate(rOffset);
		return true;
	}
}
// New game
export function newGame() {
	heldKeys.clear();
	character = new Character();
	endGameText = null;
	game.changed = true;
	// Scoring
	startTime = window.performance.now();
	time = 0;
}
function endGame(win) {
	if (!win) {
		endGameText = ["Retry?"];
		return;
	}
	highScores.time = Math.min(time, highScores.time ?? Infinity);
	endGameText = [`Time: ${time / 1000} seconds`, `Fastest Time: ${highScores.time / 1000} seconds`];
}
// Game mechanics
// Game loop
export function onKeyDown(e) {
	if (!heldKeys.has(e.key)) { // Prevent held key spam
		heldKeys.add(e.key);
		handle(e);
	}
}
export function onKeyUp(e) {
	heldKeys.delete(e.key);
}
export function handle({key}) {
	if (key === "Escape") {
		endGame(true);
		heldKeys.clear();
	} else if (key === "r" || key === "R") {
		newGame();
	} else if (key === "X" || key === "x" || key === "ArrowUp") {
		character.rotate(1); // Clockwise
	} else if (key === "Z" || key === "z") {
		character.rotate(-1); // Counterclockwise
	}
}
export function update() {
	time = window.performance.now() - startTime;
	// Handle held keys
	if (heldKeys.has("ArrowLeft") !== heldKeys.has("ArrowRight")) {
		if (Math.abs(speed) < MAX_SPEED) {
			character.update(heldKeys.has("ArrowLeft") ? -1 : 1);
		}
		speed++;
	} else {
		speed = 0;
	}
	// Update board
	return [game.changed, endGameText];
}
export function render() {
}