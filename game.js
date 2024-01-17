import {context, colors, images, sounds, levels, objects, settings, Drawable} from "./index.js";
// Constants
const GRAVITY = 1000; // px / sec^2
const FRICTION = 500; // px / sec^2
const SENSITIVITY = 1000; // px / sec^2
const MAX_SPEED = 750; // px / sec
const RADIUS = 50;
const COLLISION_ROUGH_STEP = 100;
const COLLISION_ITERATIONS = 16; // Precision of collision resolution
// Rendering constants
const DEBUG_X = 160;
const DEBUG_Y = 1260;
const DEBUG_LINE_HEIGHT = 40;
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
let changed = true;
// Level variables
let levelNumber = 1;
let level = null;
let hitbox = null;
// Time variables
let startTime = 0;
let time = 0;
let fps = 0;
// Character class
class Character extends Drawable {
	constructor (x = 0, y = 0, rotation = 0) {
		changed = true;
		function draw() {
			context.fillStyle = colors.character;
			context.fillRect(this.center.x - RADIUS, this.center.y - RADIUS, RADIUS * 2, RADIUS * 2);
			context.fillStyle = colors.accent;
			context.fillRect(this.center.x - RADIUS, this.center.y + RADIUS * 3 / 4, RADIUS * 2, RADIUS / 4);
		}
		super(draw);
		this.center = {x, y};
		this.rotation = rotation;
		this.speed = {
			x: 0,
			y: 0
		};
		objects.set("character", this);
	}
	rotate(offset) {
		if (collisionCheck()) {
			return;
		}
		changed = true;
		this.rotation = (this.rotation + offset) % 360;
	}
	update(deltaTime) {
		// Forces
		this.speed.y += GRAVITY * deltaTime; // Gravity
		// Collision
		if (collisionCheck()) {
			// Rough resolution (spam going up)
			if (collisionCheck()) {
				this.center.y -= COLLISION_ROUGH_STEP;
			}
			// Fine resolution (binary search)
			let factor = COLLISION_ROUGH_STEP;
			for (let i = 0; i < COLLISION_ITERATIONS; i++) {
				if (collisionCheck()) {
					this.center.y -= factor;
				} else {
					this.center.y += factor;
				}
				factor /= 2;
			}
			// Friction
			this.speed.x -= Math.sign(this.speed.x) * FRICTION * deltaTime;
			// Normal force
			this.speed.y = 0;
		}
		// Apply changes
		if (this.speed.x !== 0 || this.speed.y !== 0) {
			changed = true;
		}
		this.center.x += this.speed.x * deltaTime;
		this.center.y += this.speed.y * deltaTime;
	}
}
// Game and level management
export function newGame() {
	heldKeys.clear();
	character = new Character();
	changed = true;
	// Level
	newLevel(1);
	// Time
	startTime = window.performance.now();
	time = 0;
	fps = 0;
	// Add objects
	objects.set("background", new Drawable(() => context.drawImage(images[`level${levelNumber}`], 0, 0, 1920, 1280))); // Replaces placeholder background
	if (settings.debug) {
		objects.set("debug", new Drawable(() => {
			changed = true;
			context.fillStyle = colors.text;
			context.fontSize = 4;
			const texts = {
				Pos: `${character.center.x.toFixed(2)}, ${character.center.y.toFixed(2)}`,
				Speed: `${character.speed.x.toFixed(2)}, ${character.speed.y.toFixed(2)}`,
				FPS: `${fps.toFixed(2)}`,
				Time: `${time / 1000} seconds`
			};
			let textY = DEBUG_Y - (Object.keys(texts).length - 1) * DEBUG_LINE_HEIGHT;
			for (const [key, value] of Object.entries(texts)) {
				context.textAlign = "right";
				context.fillText(`${key}: `, DEBUG_X, textY);
				context.textAlign = "left";
				context.fillText(value, DEBUG_X, textY);
				textY += DEBUG_LINE_HEIGHT;
			}
		}));
	}
}
function newLevel(number) {
	if (levels[`level${number}`] == null) {
		endGame(true);
		return;
	}
	levelNumber = number;
	level = levels[`level${number}`];
	const pathText = level.getElementById("hitbox").getAttribute("d");
	hitbox = new Path2D(pathText);
	const spawnpoint = level.getElementById("spawnpoint"); // Spawnpoint is bottom center
	character = new Character(Number.parseFloat(spawnpoint.getAttribute("cx")), Number.parseFloat(spawnpoint.getAttribute("cy")) - RADIUS);
}
function endGame(win) {
	if (!win) {
		stateMachines.main.lose("Retry?");
		return;
	}
	highScores.time = Math.min(time, highScores.time ?? Infinity);
	stateMachines.main.lose({
		Time: `${time / 1000} seconds`,
		"Fastest Time": `${highScores.time / 1000} seconds`
	});
}
// Game mechanics
function collisionCheck() {
	let result = context.isPointInPath(hitbox, character.center.x + RADIUS, character.center.y + RADIUS);
	result ||= context.isPointInPath(hitbox, character.center.x - RADIUS, character.center.y + RADIUS);
	result ||= context.isPointInPath(hitbox, character.center.x + RADIUS, character.center.y - RADIUS);
	result ||= context.isPointInPath(hitbox, character.center.x - RADIUS, character.center.y - RADIUS);
	return result;
}
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
		heldKeys.clear();
		endGame(false);
	} else if (key === "r" || key === "R") {
		newLevel(levelNumber);
	} else if (key === "X" || key === "x" || key === "ArrowUp") {
		character.rotate(1); // Clockwise
	} else if (key === "Z" || key === "z") {
		character.rotate(-1); // Counterclockwise
	}
}
export function update(deltaTime) {
	deltaTime /= 1000; // Convert to seconds
	time = window.performance.now() - startTime;
	fps = 1 / deltaTime;
	// Handle held keys
	if (heldKeys.has("ArrowLeft") !== heldKeys.has("ArrowRight")) {
		const direction = heldKeys.has("ArrowLeft") ? -1 : 1;
		if (Math.abs(character.speed.x + direction * SENSITIVITY * deltaTime) < MAX_SPEED) {
			character.speed.x += direction * SENSITIVITY * deltaTime;
		}
	}
	// Update game state
	character.update(deltaTime);
	// Restart upon fall
	if (character.center.y - RADIUS > 1280) {
		sounds.death.play();
		newLevel(levelNumber);
	}
	// New level
	if (character.center.x - RADIUS > 1920) {
		newLevel(levelNumber + 1);
	}
	return changed;
}
export function render() {
	changed = false;
}