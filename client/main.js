var socket; 
socket = io.connect();


canvas_width = window.innerWidth * window.devicePixelRatio;
canvas_height = window.innerHeight * window.devicePixelRatio;

game = new Phaser.Game(canvas_width,canvas_height, Phaser.AUTO, 'gameDiv');

//the enemy player list 
var enemies = [];

var cursors;
var xVel;
var yVel;
var land;
var points;

var gameProperties = { 
	gameWidth: 4000,
	gameHeight: 4000,
	game_elemnt: "gameDiv",
	in_game: false,
};

var main = function(game){
};

function onsocketConnected () {
	console.log("connected to server"); 
	createPlayer();
	gameProperties.in_game = true;
	// send the server our initial position and tell it we are connected
	socket.emit('new_player', {x: 0, y: 0, angle: 0});
}

// When the server notifies us of client disconnection, we find the disconnected
// enemy and remove from our game
function onRemovePlayer (data) {
	var removePlayer = findplayerbyid(data.id);
	// Player not found
	if (!removePlayer) {
		console.log('Player not found: ', data.id)
		return;
	}
	
	removePlayer.player.destroy();
	enemies.splice(enemies.indexOf(removePlayer), 1);
} 

function createPlayer () {
	player = game.add.sprite(50, 50, 'tank', 'tank1');
	//player.texture.baseTexture.skipRender = false
	player.anchor.setTo(0.5, 0.5);
	player.bringToTop();
    
    game.physics.p2.enable(player, false);
	//game.physics.enable(player, Phaser.Physics.ARCADE);
	player.body.collideWorldBounds = true;
}

// this is the enemy class. 
var remote_player = function (id, startx, starty, start_angle) {
	this.x = startx;
	this.y = starty;
	//this is the unique socket id. We use it as a unique name for enemy
	this.id = id;
	this.angle = start_angle;
	
	this.player = game.add.sprite(0, 0, 'tank', 'tank1');
	this.player.anchor.setTo(0.5,0.5);

	game.physics.p2.enableBody(this.player, false);
	this.player.body.data.shapes[0].sensor = true;
}

//Server will tell us when a new enemy player connects to the server.
//We create a new enemy in our game.
function onNewPlayer (data) {
	console.log(data);
	//enemy object 
	var new_enemy = new remote_player(data.id, data.x, data.y, data.angle); 
	enemies.push(new_enemy);
}

//Server tells us there is a new enemy movement. We find the moved enemy
//and sync the enemy movement with the server
function onEnemyMove (data) {
	//console.log(data.id);
	//console.log(enemies);
	var movePlayer = findplayerbyid (data.id); 
	
	if (!movePlayer) {
		return;
	}
	movePlayer.player.body.x = data.x; 
	movePlayer.player.body.y = data.y; 
	movePlayer.player.angle = data.angle; 
}

function onEnemyPoint(data){
	var pointPlayer = findplayerbyid(data.id);
	console.log(data.id +" points are "+ data.points);
}

function gotPoint(){
	points = points + 1;
	socket.emit('got_point', {points: this.points});
}

//This is where we use the socket id. 
//Search through enemies list to find the right enemy of the id.
function findplayerbyid (id) {
	for (var i = 0; i < enemies.length; i++) {
		if (enemies[i].id == id) {
			return enemies[i]; 
		}
	}
}

main.prototype = {
	preload: function() {
		game.stage.disableVisibilityChange = true;
		game.scale.scaleMode = Phaser.ScaleManager.RESIZE;
		game.world.setBounds(0, 0, gameProperties.gameWidth, gameProperties.gameHeight, false, false, false, false);
		game.physics.startSystem(Phaser.Physics.P2JS);
		//game.physics.p2.setBoundsToWorld(false, false, false, false, false)
		game.physics.p2.gravity.y = 0;
		game.physics.p2.applyGravity = false; 
		game.physics.p2.enableBody(game.physics.p2.walls, false); 
		// physics start system
		//game.physics.p2.setImpactEvents(true);

		game.load.baseURL = 'http://examples.phaser.io/';
		game.load.crossOrigin = 'anonymous';

		game.load.atlas('tank', 'assets/games/tanks/tanks.png', 'assets/games/tanks/tanks.json');
		game.load.image('bullet', 'assets/games/tanks/bullet.png');
		game.load.image('earth', 'assets/games/tanks/scorched_earth.png');
    },
	
	create: function () {
		land = game.add.tileSprite(0, 0, 800, 600, 'earth');
		land.fixedToCamera = true;

		console.log("client started");
	    createPlayer();
        console.log("connected to server"); 
	    gameProperties.in_game = true;
	    // send the server our initial position and tell it we are connected
	    socket.emit('new_player', {x: 0, y: 0, angle: 0});
        
        
		//socket.on('connect', onsocketConnected); 
		
		//listen to new enemy connections
		socket.on("new_enemyPlayer", onNewPlayer);
		//listen to enemy movement 
		socket.on("enemy_move", onEnemyMove);
		
		// when received remove_player, remove the player passed; 
		socket.on('remove_player', onRemovePlayer); 

		socket.on('enemy_point', onEnemyPoint);
        cursors = game.input.keyboard.createCursorKeys();
        xVel = 0;
        yVel = 0;
		points = 0;
	},
	
	update: function () {
		// emit the player input
        
		//move the player when the player is made 
		if (gameProperties.in_game) {
            if (cursors.right.isDown)
                xVel += 5;

            else if (cursors.left.isDown)
                xVel -= 5;
            
            else if (player.body.velocity.x > 0)
                xVel -= 1;

            else if (player.body.velocity.x < 0)
                xVel += 1;

            if (cursors.up.isDown)
                yVel -= 5;

            else if (cursors.down.isDown)
                yVel += 5;

            else if (player.body.velocity.y > 0)
                yVel -= 1;

            else if (player.body.velocity.y < 0)
                yVel += 1;
            
            moveThePlayer(player, xVel, yVel);

			if (cursors.right.isDown){
				gotPoint();
			}
            /*
			var pointer = game.input.mousePointer;
			
			if (distanceToPointer(player, pointer) <= 50) {
				movetoPointer(player, 0, pointer, 100);
			} else {
				movetoPointer(player, 500, pointer);
			}*/
			
					
			//Send a new position data to the server 
			socket.emit('move_player', {x: player.x, y: player.y, angle: player.angle});
            
            
            game.debug.text(points, 100, 100);
            
		}
	}
}

var gameBootstrapper = {
    init: function(gameContainerElementId){
		game.state.add('main', main);
		game.state.start('main'); 
    }
};;

gameBootstrapper.init("gameDiv");