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

var gameProperties = { 
	gameWidth: 4000,
	gameHeight: 4000,
	//game_elemnt: "gameDiv",
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
	
	removePlayer.tank.destroy();
	enemies.splice(enemies.indexOf(removePlayer), 1);
} 

function createPlayer () {
    player = new Tank(0, 50, 50, 0);
}

// this is the enemy class. 
/*var remote_player = function (id, startx, starty, start_angle) {
	this.x = startx;
	this.y = starty;
	//this is the unique socket id. We use it as a unique name for enemy
	this.id = id;
	this.angle = start_angle;
	
	this.player = game.add.sprite(0, 0, 'tank', 'tank1');
	this.player.anchor.setTo(0.5,0.5);

	game.physics.p2.enableBody(this.player, false);
	this.player.body.data.shapes[0].sensor = true;
}*/

function Tank(id, x, y, r) {
    this.id = id;
    this.tank = game.add.sprite(x, y);
    this.tank.texture.baseTexture.skipRender = false;

    this.tank = game.add.sprite(x, y, 'tank', 'tank1');
    this.tank.anchor.setTo(0.5, 0.5);
    this.tank.animations.add('move', ['tank1', 'tank2', 'tank3', 'tank4', 'tank5', 'tank6'], 20, true);
    game.physics.enable(this.tank, Phaser.Physics.ARCADE);
    this.tank.body.collideWorldBounds = true;

    this.tank.maxVel = 300;
    this.tank.vel = 0;

    this.turrets = new Array();
    this.turrets.push(new Turret(this.tank, 0, 0, 0));
    //console.log(this.turrets);
}

Tank.prototype.update = function () {
    game.physics.arcade.velocityFromAngle(this.tank.angle, this.tank.vel, this.tank.body.velocity);
};

function Turret(parentTank, x, y, r, cd) {

    this.turret = game.add.sprite(x, y, 'tank', 'turret');
    this.turret.anchor.setTo(0.3, 0.5);
    this.turret.rotation = r;
    this.turret.cooldown = cd;

    parentTank.addChild(this.turret);
}

function rotateTurretsToMouse(tank) {
    doSendTurretData = false;
    for (i = 0; i < tank.turrets.length; i++) {
        temp = tank.turrets[i].turret.rotation;
        tank.turrets[i].turret.rotation = game.physics.arcade.angleToPointer(tank.tank) - tank.tank.rotation;
        if (temp != tank.turrets[i].turret.rotation)
        {
            console.log(tank.turrets[i].turret.rotation);
            doSendTurretData = true;
        }
    }
    if (doSendTurretData)
    {
        //TODO sendRotationData;
    }
}

//Server will tell us when a new enemy player connects to the server.
//We create a new enemy in our game.
function onNewPlayer (data) {
	//console.log(data);
	//enemy object 
	var new_enemy = new Tank(data.id, data.x, data.y, data.angle); 
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
	    console.log("player not found by id");
	}
	//movePlayer.player.body.x = data.x; 
	//movePlayer.player.body.y = data.y; 
    //movePlayer.player.angle = data.angle;
	movePlayer.tank.x = data.x;
	movePlayer.tank.y = data.y;
	movePlayer.tank.rotation = data.angle;
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
		cursors = game.input.keyboard.addKeys({ 'w': Phaser.KeyCode.W, 's': Phaser.KeyCode.S, 'a': Phaser.KeyCode.A, 'd': Phaser.KeyCode.D, 'up': Phaser.KeyCode.UP, 'down': Phaser.KeyCode.DOWN, 'left': Phaser.KeyCode.LEFT, 'right': Phaser.KeyCode.RIGHT });
	},
	
	update: function () {
		// emit the player input
        
		//move the player when the player is made 
		if (gameProperties.in_game) {
            
		    if (cursors.right.isDown || cursors.d.isDown)
		        player.tank.body.angularVelocity = 200;

		    else if (cursors.left.isDown || cursors.a.isDown)
		        player.tank.body.angularVelocity = -200;
		    else
		        player.tank.body.angularVelocity = 0;


		    if (cursors.up.isDown || cursors.w.isDown) {
		        player.tank.vel += (player.tank.maxVel - player.tank.vel) / 20.0;
		    }
		    else if (cursors.down.isDown || cursors.s.isDown) {
		        player.tank.vel += (-player.tank.maxVel - player.tank.vel) / 15.0;
		    }
		    else if (player.tank.vel > 0) {
		        player.tank.vel -= 10;
		        if (player.tank.vel < 0) player.tank.vel = 0;
		    }
		    else if (player.tank.vel < 0) {
		        player.tank.vel += 10;
		        if (player.tank.vel > 0) player.tank.vel = 0;
		    }

		    player.update();
		    for (i = 0; i < enemies.length; i++)
		    {
		        enemies[i].update();
		    }
		    rotateTurretsToMouse(player);

            /*
			var pointer = game.input.mousePointer;
			
			if (distanceToPointer(player, pointer) <= 50) {
				movetoPointer(player, 0, pointer, 100);
			} else {
				movetoPointer(player, 500, pointer);
			}*/
			
					
			//Send a new position data to the server 
			socket.emit('move_player', {x: player.tank.x, y: player.tank.y, angle: player.tank.rotation});
            
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