import {context, colors, images, sounds, levels, stateMachines, objects, settings, Drawable} from "./index.js";
// Constants
const GRAVITY = 1000; // px / sec^2
const FRICTION = 500; // px / sec^2
const SENSITIVITY = 1000; // px / sec^2
const ROTATION_GRAVITY = 90; // deg / sec
const ROTATION_SENSITIVITY = 180; // deg / sec
const MAX_SPEED = 750; // px / sec
const RADIUS = 50;
// Rendering constants
const DEBUG_X = 200;
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
let deaths = 0;
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
			const radians = (this.rotation + 45) * Math.PI / 180; // Convert to radians and offset
			const cosOffset = Math.sqrt(2) * RADIUS * Math.cos(radians);
			const sinOffset = Math.sqrt(2) * RADIUS * Math.sin(radians);
			// Base
			context.fillStyle = colors.character;
			const hitbox = new Path2D();
			hitbox.moveTo(this.center.x - cosOffset, this.center.y - sinOffset);
			hitbox.lineTo(this.center.x - sinOffset, this.center.y + cosOffset);
			hitbox.lineTo(this.center.x + cosOffset, this.center.y + sinOffset);
			hitbox.lineTo(this.center.x + sinOffset, this.center.y - cosOffset);
			hitbox.closePath();
			context.fill(hitbox);
			// Platform
			context.fillStyle = colors.accent;
			context.beginPath();
			context.moveTo(...this.transform(-1, 3 / 4));
			context.lineTo(this.center.x - sinOffset, this.center.y + cosOffset);
			context.lineTo(this.center.x + cosOffset, this.center.y + sinOffset);
			context.lineTo(...this.transform(1, 3 / 4));
			context.closePath();
			context.fill();
		}
		super(draw);
		this.center = {x, y};
		this.speed = {x: 0, y: 0};
		this.rotation = rotation; // Degrees clockwise (y direction opposite of math graphs)
		objects.set("character", this);
	}
	get radians() {
		return this.rotation * Math.PI / 180;
	}
	transform(x, y) {
		return [
			this.center.x + x * RADIUS * Math.cos(this.radians) - y * RADIUS * Math.sin(this.radians),
			this.center.y + x * RADIUS * Math.sin(this.radians) + y * RADIUS * Math.cos(this.radians)
		];
	}
	update(deltaTime) {
		// Apply changes
		if (this.speed.x !== 0 || this.speed.y !== 0) {
			changed = true;
		}
		this.center.x += this.speed.x * deltaTime;
		this.center.y += this.speed.y * deltaTime;
		// Gravity
		this.speed.y += GRAVITY * deltaTime;
		const contacts = collisionCheck();
		if (contacts.filter(Boolean).length === 1) { // Rotation if one point of contact
			// Fall away from contact point
			const contactAngle = contacts.findIndex(Boolean) * 45 + 225; // 225° is angle of top left corner in Canvas (inverted y-axis) coordinates
			const direction = -Math.sign(Math.cos((contactAngle + this.rotation) * Math.PI / 180));
			this.rotation = (this.rotation + direction * ROTATION_GRAVITY * deltaTime) % 360;
		}
		// Collision
		if (collisionCheck().some(Boolean)) { // Cannot use contacts again because angle change
			collisionResolve();
			// Friction
			if (Math.abs(this.speed.x) < FRICTION * deltaTime) {
				this.speed.x = 0;
			} else {
				this.speed.x -= Math.sign(this.speed.x) * FRICTION * deltaTime;
			}
			// Normal force
			this.speed.y = 0;
		}
	}
}
// Game and level management
export function newGame() {
	heldKeys.clear();
	character = new Character();
	deaths = 0;
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
			context.font = "30px monospace";
			const texts = {
				Center: `${character.center.x.toFixed(4)}, ${character.center.y.toFixed(4)}`,
				Speed: `${character.speed.x.toFixed(2)}, ${character.speed.y.toFixed(2)}`,
				Rotation: `${character.rotation.toFixed(2)}°`,
				Contacts: `${collisionCheck().map((value) => value ? "T" : "F")}`,
				Deaths: `${deaths}`,
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
		Deaths: deaths,
		Time: `${time / 1000} seconds`,
		"Fastest Time": `${highScores.time / 1000} seconds`
	});
}
// Collision
const COLLISION_ROUGH_STEP = 10;
const COLLISION_ITERATIONS = 12; // Precision of collision resolution
const COLLISION_POINTS = [
	[-1, -1],
	[0, -1],
	[1, -1],
	[1, 0],
	[1, 1],
	[0, 1],
	[-1, 1],
	[-1, 0]
];
function collisionCheck() {
	return COLLISION_POINTS.map(([x, y]) => context.isPointInPath(hitbox, ...character.transform(x, y)));
}
function collisionResolve() {
	const normalAngle = -90 * Math.PI / 180; // For now just straight up
	// Rough resolution (spam going away from every contact point)
	while (collisionCheck().some(Boolean)) {
		character.center.x += Math.cos(normalAngle) * COLLISION_ROUGH_STEP;
		character.center.y += Math.sin(normalAngle) * COLLISION_ROUGH_STEP;
	}
	// Fine resolution (binary search)
	let factor = COLLISION_ROUGH_STEP;
	for (let i = 0; i < COLLISION_ITERATIONS; i++) {
		if (collisionCheck().some(Boolean)) {
			character.center.x += Math.cos(normalAngle) * factor;
			character.center.y += Math.sin(normalAngle) * factor;
		} else {
			character.center.x -= Math.cos(normalAngle) * factor;
			character.center.y -= Math.sin(normalAngle) * factor;
		}
		factor /= 2;
	}
	character.center.y += factor * 2; // Keep character in ground to prevent gravity next update
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
		heldKeys.clear();
		endGame(false);
	} else if (key === "r" || key === "R") {
		newLevel(levelNumber);
	}
}
function handleHeld(deltaTime) {
	if (heldKeys.has("ArrowLeft") !== heldKeys.has("ArrowRight")) {
		const direction = heldKeys.has("ArrowLeft") ? -1 : 1;
		character.speed.x += direction * Math.cos(character.radians) * SENSITIVITY * deltaTime;
		character.speed.y += direction * Math.sin(character.radians) * SENSITIVITY * deltaTime;
		if (Math.abs(character.speed.x) > MAX_SPEED) { // TODO: Figure out what to do with vertical speed
			character.speed.x = Math.sign(character.speed.x) * MAX_SPEED;
		}
	}
	if (heldKeys.has("x") || heldKeys.has("x") || heldKeys.has("ArrowUp")) {
		character.rotation = (character.rotation + ROTATION_SENSITIVITY * deltaTime) % 360; // Clockwise
	}
	if (heldKeys.has("Z") || heldKeys.has("z") || heldKeys.has("ArrowDown")) {
		character.rotation = (character.rotation - ROTATION_SENSITIVITY * deltaTime) % 360; // Counterclockwise
	}
}
export function update(deltaTime) {
	time = window.performance.now() - startTime;
	fps = 1 / deltaTime;
	// Handle held keys
	handleHeld(deltaTime);
	// Update game state
	character.update(deltaTime);
	// Restart upon fall
	if (character.center.y - RADIUS > 1280) {
		deaths++;
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