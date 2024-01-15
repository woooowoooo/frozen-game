import {context, objects, settings, Drawable} from "./index.js";
// Constants
const SENSITIVITY = 1000; // Pixels per second per second
const MAX_SPEED = 500; // Pixels per second
// State variables
export const highScores = new Proxy(JSON.parse(localStorage.getItem("frozenHighScores")) ?? {}, {
	set: function (target, property, value) {
		console.log(`${property} has been set to ${value}`);
		const valid = Reflect.set(...arguments);
		localStorage.setItem("frozenHighScores", JSON.stringify(target));
		return valid;
	}
});
const heldKeys = new Set();
let character = null;
let endGameText = null;
let changed = true;
// Scoring
let startTime = 0;
let time = 0;
// Character class
class Character extends Drawable {
	constructor (x, y, rotation) {
		changed = true;
		function draw() {
			context.fillStyle = "white";
			context.fillRect(this.x, this.y, 100, 100);
		}
		super(draw);
		this.x = x ?? 0;
		this.y = y ?? 0;
		this.rotation = rotation ?? 0;
		this.speed = 0;
	}
	rotate(offset) {
		if (false /* collisionCheck(this) */) {
			return;
		}
		changed = true;
		this.rotation = (this.rotation + offset) % 360;
	}
	translate(offset) {
		if (false /* collisionCheck(this) */) {
			return;
		}
		changed = true;
		this.x += offset;
	}
}
// New game
export function newGame() {
	heldKeys.clear();
	character = new Character(600, 600);
	endGameText = null;
	changed = true;
	// Scoring
	startTime = window.performance.now();
	time = 0;
	// Objects
	objects.set("character", character);
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
export function update(deltaTime) {
	time = window.performance.now() - startTime;
	// Handle held keys
	if (heldKeys.has("ArrowLeft") !== heldKeys.has("ArrowRight")) {
		const direction = heldKeys.has("ArrowLeft") ? -1 : 1;
		if (Math.abs(character.speed + direction * SENSITIVITY * (deltaTime / 1000)) < MAX_SPEED) {
			character.speed += direction * SENSITIVITY * (deltaTime / 1000);
		}
	}
	// Update game state
	character.translate(character.speed * deltaTime / 1000);
	return [changed, endGameText];
}
export function render() {
	changed = false;
}