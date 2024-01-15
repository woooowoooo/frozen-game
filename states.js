import StateMachine from "./state-machine/module.js";
import {
	canvas, context, images, sounds, stateMachines, objects, settings,
	clear, render, loadResources,
	Drawable, MuteButton, TextButton, Slider
} from "./index.js";
import {newGame, onKeyDown, onKeyUp, update, render as gameRender} from "./game.js";
// State machine
const stateMachine = new StateMachine({
	init: "boot",
	transitions: [{
		name: "toMenu",
		from: ["boot", "menu", "settings", "help", "credits", "gameOver"],
		to: "menu"
	}, {
		name: "start",
		from: "menu",
		to: "game"
	}, {
		name: "toSettings",
		from: "menu",
		to: "settings"
	}, {
		name: "toHelp",
		from: "menu",
		to: "help"
	}, {
		name: "toCredits",
		from: "menu",
		to: "credits"
	}, {
		name: "lose",
		from: "game",
		to: "gameOver"
	}, {
		name: "retry",
		from: "gameOver",
		to: "game"
	}],
	methods: {
		onTransition(lifecycle) {
			console.log(`Transition: ${lifecycle.transition}\tNew State: ${lifecycle.to}`);
		},
		onAfterTransition() {
			render();
		},
		async onBoot() {
			// Loading screen
			objects.set("background", new Drawable(() => {
				context.fillStyle = "black";
				context.fillRect(0, 0, 1920, 1280);
			}));
			objects.set("loading", new Drawable(() => {
				context.fillStyle = "white";
				context.fontSize = 16;
				context.textAlign = "center";
				context.fillText("LOADING", 960, 400);
				context.fontSize = 8;
				context.fillText("If this doesn't go away,", 960, 800);
				context.fillText("refresh the page.", 960, 960);
			}));
			render();
			await loadResources();
			console.log("Resources loaded.", images, sounds);
			objects.delete("loading");
			// Prompt for user interaction so autoplay won't get blocked
			objects.set("prompt", new Drawable(() => {
				context.fillStyle = "white";
				context.fontSize = 8;
				context.textAlign = "center";
				context.fillText("Loading finished.", 960, 400);
				context.fillText("CLICK ANYWHERE", 960, 800);
				context.fillText("TO CONTINUE", 960, 960);
			}));
			canvas.addEventListener("click", stateMachine.toMenu, {once: true});
		},
		onMenu() {
			clear();
			sounds.goldberg.play();
			objects.set("background", new Drawable(() => context.drawImage(images.background, 0, 0, 1920, 1280)));
			objects.set("title", new Drawable(() => {
				context.fillStyle = "black";
				context.fontSize = 20;
				context.fillText("Frozen Game", 960, 360);
			}));
			objects.set("start", new TextButton(960, 560, "Start", stateMachine.start, 640));
			objects.set("settings", new TextButton(960, 720, "Settings", stateMachine.toSettings, 640));
			objects.set("help", new TextButton(960, 880, "Help", stateMachine.toHelp, 640));
			objects.set("credits", new TextButton(960, 1040, "Credits", stateMachine.toCredits, 640));
			objects.set("mute", new MuteButton());
		},
		onSettings() {
			clear();
			objects.set("background", new Drawable(() => context.drawImage(images.background, 0, 0, 1920, 1280)));
			objects.set("text", new Drawable(() => {
				context.fillStyle = "black";
				context.textAlign = "right";
				context.fillText("Volume:", 600, 640 + 20);
			}));
			objects.set("volume", new Slider(1200, 640, 960, "volume", 0, 100, 10, false, () => {
				for (const sound of Object.values(sounds)) {
					sound.volume = settings.volume / 100;
				}
			}));
			objects.set("return", new TextButton(960, 880, "Return", stateMachine.toMenu, 640));
			objects.set("mute", new MuteButton());
		},
		onHelp() {
			clear();
			objects.set("background", new Drawable(() => context.drawImage(images.background, 0, 0, 1920, 1280)));
			objects.set("help", new Drawable(() => {
				context.fillStyle = "black";
				context.fontSize = 8;
				context.fillText("This game will eventually be a platformer.", 960, 360);
				context.fillText("As of right now, all you can do is press Escape.", 960, 480);
			}));
			objects.set("return", new TextButton(960, 880, "Return", stateMachine.toMenu, 640));
			objects.set("mute", new MuteButton());
		},
		onCredits() {
			clear();
			objects.set("background", new Drawable(() => context.drawImage(images.background, 0, 0, 1920, 1280)));
			objects.set("credits", new Drawable(() => {
				context.fillStyle = "black";
				context.fontSize = 12;
				context.fillText("Everything", 960, 360);
				context.fillText("woooowoooo", 960, 480);
			}));
			objects.set("return", new TextButton(960, 880, "Return", stateMachine.toMenu, 640));
			objects.set("mute", new MuteButton());
		},
		onGame() {
			clear();
			window.addEventListener("keydown", onKeyDown);
			window.addEventListener("keyup", onKeyUp);
			objects.set("background", new Drawable(() => context.drawImage(images.background, 0, 0, 1920, 1280)));
			objects.set("mute", new MuteButton());
			objects.set("game", new Drawable(gameRender));
			newGame();
			requestAnimationFrame(loop);
		},
		onGameOver(_, text) {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
			for (const sound of Object.values(sounds).filter(sound => !sound.paused)) {
				sound.pause();
			}
			objects.set("endScreen", new Drawable(() => {
				context.fillStyle = "rgba(0, 0, 0, 0.5)";
				context.fillRect(0, 0, 1920, 1280);
				context.fillStyle = "white";
				context.fontSize = 16;
				context.textAlign = "center";
				context.fillText("GAME OVER", 960, 400);
				context.fontSize = 8;
				let textY = 540;
				for (const line of text) {
					context.fillText(line, 960, textY);
					textY += 100;
				}
			}));
			objects.set("menu", new TextButton(672, 880, "Menu", stateMachine.toMenu, 480));
			objects.set("retry", new TextButton(1248, 880, "Retry", stateMachine.retry, 480));
		},
		onLeaveGameOver() {
			for (const sound of Object.values(sounds).filter(sound => sound.paused)) {
				sound.play();
			}
		}
	}
});
stateMachines.main = stateMachine;
// Main loop
const FPS = 60;
const FRAME_TIME = 1000 / FPS;
let lastTime = window.performance.now();
function loop(time) {
	const deltaTime = time - lastTime;
	// Lock to 60 fps
	if (deltaTime < FRAME_TIME) {
		requestAnimationFrame(loop);
		return;
	}
	lastTime = time - (time % FRAME_TIME);
	// Break on game loss
	if (!stateMachine.is("game")) {
		return;
	}
	// Game loop (handling is done in game.js)
	const [changed, endText] = update(deltaTime);
	if (endText != null) {
		stateMachine.lose(endText);
	}
	if (changed) { // If level has updated
		render();
	}
	requestAnimationFrame(loop);
}