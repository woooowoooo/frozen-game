import {context, colors, objects, settings, Drawable} from "./index.js";
// Constants
const GRAVITY = 100; // px / sec^2
const SENSITIVITY = 1000; // px / sec^2
const MAX_SPEED = 500; // px / sec
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
			context.fillStyle = colors.character;
			context.fillRect(this.center.x, this.center.y, 100, 100);
		}
		super(draw);
		this.center = {x, y};
		this.rotation = rotation ?? 0;
		this.speed = {
			x: 0,
			y: 0
		};
	}
	rotate(offset) {
		if (false /* collisionCheck(this) */) {
			return;
		}
		changed = true;
		this.rotation = (this.rotation + offset) % 360;
	}
	update(deltaTime) {
		if (false /* collisionCheck(this) */) {
			return;
		}
		changed = true;
		this.speed.y += GRAVITY * deltaTime; // Gravity
		this.center.x += this.speed.x * deltaTime;
		this.center.y += this.speed.y * deltaTime;
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
	deltaTime /= 1000; // Convert to seconds
	time = window.performance.now() - startTime;
	// Handle held keys
	if (heldKeys.has("ArrowLeft") !== heldKeys.has("ArrowRight")) {
		const direction = heldKeys.has("ArrowLeft") ? -1 : 1;
		if (Math.abs(character.speed.x + direction * SENSITIVITY * deltaTime) < MAX_SPEED) {
			character.speed.x += direction * SENSITIVITY * deltaTime;
		}
	}
	// Update game state
	character.update(deltaTime);
	return [changed, endGameText];
}
export function render() {
	changed = false;
}