var socket; 
socket = io.connect();


game = new Phaser.Game(window.innerWidth,window.innerHeight, Phaser.AUTO, 'gameDiv');

//the enemy player list 
var enemies = [];

var cursors;
var xVel;
var yVel;
var land;

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
	
	removePlayer.tank.destroy();
	enemies.splice(enemies.indexOf(removePlayer), 1);
} 

function createPlayer () {
    player = new Tank(0, 50, 50, 0);
    cameraFocus = game.add.sprite(0, 0);
    game.camera.follow(cameraFocus);
}

function Tank(id, x, y, r) {
    this.points = 0;
    this.id = id;
    this.tank = game.add.sprite(x, y);
    this.tank.texture.baseTexture.skipRender = false;

    this.tank = game.add.sprite(x, y, 'tank');
    this.tank.anchor.setTo(0.5, 0.5);
    //this.tank.animations.add('move', ['tank1', 'tank2', 'tank3', 'tank4', 'tank5', 'tank6'], 20, true);
    game.physics.enable(this.tank, Phaser.Physics.ARCADE);
    this.tank.body.collideWorldBounds = true;

    this.tank.maxVel = 300;
    this.tank.vel = 0;

    this.turrets = new Array();
    this.turrets.push(new Turret(this.tank, -20,0, 0));
    //console.log(this.turrets);
}

Tank.prototype.update = function () {
    game.physics.arcade.velocityFromAngle(this.tank.angle, this.tank.vel, this.tank.body.velocity);
};

function Turret(parentTank, x, y, r, cd) {

    this.turret = game.add.sprite(x, y, 'turret');
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
        if (temp != tank.turrets[i].turret.rotation) {
            //console.log(tank.turrets[i].turret.rotation);
            doSendTurretData = true;
        }
    }
    if (doSendTurretData) {
        //TODO sendRotationData;
    }
}

//Server will tell us when a new enemy player connects to the server.
//We create a new enemy in our game.
function onNewPlayer (data) {
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
	}
	console.log(data);
	movePlayer.tank.x = data.x;
	movePlayer.tank.y = data.y;
	movePlayer.tank.angle = data.angle;
}

function onEnemyPoint(data){
	var pointPlayer = findplayerbyid(data.id);
	pointPlayer.points = data.points;
	//console.log(data.id +" points are "+ pointPlayer.points);
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
		//game.load.baseURL = 'http://examples.phaser.io/';
		//game.load.crossOrigin = 'anonymous';
		//game.load.atlas('tank', 'assets/tanks.png', 'assets/tanks.json');
		game.load.image('bullet', 'assets/bullet.png');
		game.load.image('earth', 'assets/earth.png');
        game.load.image('tank','assets/SpaceShooterPack/PNG/playerShip1_red.png');
        game.load.image('turret','assets/SpaceShooterPack/PNG/Parts/gun00.png');
    //game.load.atlasXML('tank','assets/SpaceShooterPack/Spritesheet/sheet.png','assets/SpaceShooterPack/Spritesheet/sheet.xml');
    },
	
	create: function () {
        game.stage.disableVisibilityChange = true;
		game.scale.scaleMode = Phaser.ScaleManager.RESIZE;
		game.physics.startSystem(Phaser.Physics.P2JS);
		//game.physics.p2.setBoundsToWorld(false, false, false, false, false)
		game.physics.p2.gravity.y = 0;
		game.physics.p2.applyGravity = false; 
		game.physics.p2.enableBody(game.physics.p2.walls, false); 
        // physics start system
		//game.physics.p2.setImpactEvents(true);
        
        game.world.setBounds(0, 0, gameProperties.gameWidth, 
        gameProperties.gameHeight, false, false, false, false);
        
		land = game.add.tileSprite(0, 0, window.innerWidth, window.innerHeight, 'earth');
		land.fixedToCamera = true;

		console.log("client started");
	    createPlayer();
        console.log("connected to server"); 
	    gameProperties.in_game = true;
	    // send the server our initial position and tell it we are connected
	    socket.emit('new_player', { x: 0, y: 0, angle: 0, points: 0 });
        
        
		//socket.on('connect', onsocketConnected); 
		
		//listen to new enemy connections
		socket.on("new_enemyPlayer", onNewPlayer);
		//listen to enemy movement 
		socket.on("enemy_move", onEnemyMove);
		
		// when received remove_player, remove the player passed; 
		socket.on('remove_player', onRemovePlayer); 

		socket.on('enemy_point', onEnemyPoint);
        //game.camera.follow(player);
        cursors = game.input.keyboard.addKeys({ 'w': Phaser.KeyCode.W, 's': Phaser.KeyCode.S, 'a': Phaser.KeyCode.A, 'd': Phaser.KeyCode.D, 'up': Phaser.KeyCode.UP, 'down': Phaser.KeyCode.DOWN, 'left': Phaser.KeyCode.LEFT, 'right': Phaser.KeyCode.RIGHT });
		points = 0;
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

            if (player.tank.body.angularVelocity != 0 || player.tank.vel != 0){
                //Send a new position data to the server 
			     socket.emit('move_player', { x: player.tank.x, y: player.tank.y, angle: player.tank.angle });
            }
            
            
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
            
            /*if (!game.camera.atLimit.x)
            {
                land.tilePosition.x -= (xVel * game.time.physicsElapsed);
            }

            if (!game.camera.atLimit.y)
            {
                land.tilePosition.y -= (yVel * game.time.physicsElapsed);
            }*/

			if (cursors.right.isDown) {
				gotPoint();
			}

            /*
			var pointer = game.input.mousePointer;
			
			if (distanceToPointer(player, pointer) <= 50) {
				movetoPointer(player, 0, pointer, 100);
			} else {
				movetoPointer(player, 500, pointer);
			}*/
            

			cameraFocus.x = (player.tank.x - player.tank.anchor.x + 0.1 * game.width * (game.input.x / game.width - 0.5));
			cameraFocus.y = (player.tank.y - player.tank.anchor.y + 0.1 * game.height * (game.input.y / game.height - 0.5));

            land.tilePosition.x = -game.camera.x;
            land.tilePosition.y = -game.camera.y;
		}
	},

	render: function(){
		game.debug.text("me", 100, 50);
		game.debug.text(points, 500, 50);
		for (var i = 0; i < enemies.length; i++){
			game.debug.text(enemies[i].id, 100, i * 50 + 100);
			game.debug.text(enemies[i].points, 500, i * 50 + 100);
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