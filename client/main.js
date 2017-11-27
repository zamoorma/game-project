var socket; 
socket = io.connect();


game = new Phaser.Game(window.innerWidth,window.innerHeight*98/100, Phaser.AUTO, 'gameDiv');

//the enemy player list 
var enemies = [];
var leaderboard = [];

var cursors;
var xVel;
var yVel;
var land;
var walls;

var gameProperties = { 
	gameWidth: 3840,
	gameHeight: 3840,
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
    var removeLeaderboard = findpositionbyid(data.id);
	// Player not found
	if (!removePlayer) {
		console.log('Player not found: ', data.id)
		return;
	}
	
	removePlayer.tank.destroy();
	enemies.splice(enemies.indexOf(removePlayer), 1);
    leaderboard.splice(leaderboard.indexOf(leaderboard[removeLeaderboard]), 1);
} 

function createPlayer () {
    player = new Tank(0, 128 + 256 + 512 * Math.floor(Math.random() * 7), 128 + 256 + 512 * Math.floor(Math.random() * 7), 0, 0);
    cameraFocus = game.add.sprite(0, 0);
    game.camera.follow(cameraFocus);
    leaderboard.push(new Score(0, 0));
}

function Score(id, p){
    this.points = p;
    this.id = id;
}

//function Wall(x, y) {
//    this.wall = game.add.sprite(x, y, 'wall');
//    this.wall.anchor.setTo(0, 0);
//    game.physics.enable(this.wall, Phaser.Physics.ARCADE);
//    this.wall.vel = 0;
//}

function Tank(id, x, y, r, p) {
    this.points = p;
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

    this.turrets.push(new Turret(this.tank, -20, 0, 0));
    //console.log(this.turrets);
}

Tank.prototype.update = function (type) {
    game.physics.arcade.velocityFromAngle(this.tank.angle, this.tank.vel, this.tank.body.velocity);
    game.physics.arcade.collide(this.tank, walls);
    //console.log(type);
    //console.log(type);
    if (type == "player") {
        game.physics.arcade.overlap(this.tank, enemyBullets, collisionHandler, null, this);
    }
};
function collisionHandler(tank, bullet) {
    bullet.kill();
    //take damage
    console.log(bullet.id);
    socket.emit('got_hit', { ownerID: bullet.id});
    //send damage to server
}


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
        tank.turrets[i].turret.rotation = game.math.angleBetween(tank.turrets[i].turret.world.x, tank.turrets[i].turret.world.y, game.input.activePointer.worldX, game.input.activePointer.worldY) - tank.tank.rotation;
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
	var new_enemy = new Tank(data.id, data.x, data.y, data.angle, data.points);
	enemies.push(new_enemy);
    var new_score = new Score(data.id, data.points);
    leaderboard.push(new_score);
    
    i = leaderboard.length - 1;
    console.log(i);
    var atTop = false;
    do{
        if (i == 0){atTop = true;
                   console.log("highest part1");}
        else if (leaderboard[i].points > leaderboard[i-1].points){
            var temp = leaderboard[i-1];
            leaderboard[i-1] = leaderboard[i];
            leaderboard[i] = temp;
            i = i - 1;
        }
        else if (leaderboard[i].points <= leaderboard[i-1].points){
            atTop = true;
            console.log("highest part2");
        }
    } while (atTop == false);
}

function onMapData(data)
{
    walls = game.add.group();
    for (y = 0; y < data.length; y++) {
        for (x = 0; x < data[y].length; x++) {
            if (data[y][x] == 1) {
                wall = game.add.sprite(x * 256, y * 256, 'wall');
                wall.anchor.setTo(0, 0);
                game.physics.enable(wall, Phaser.Physics.ARCADE);
                wall.vel = 0;
                wall.checkCollision = true;
                wall.body.moves = false;
                walls.add(wall);
            }
        }

    }
    
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
	//console.log(data);
	movePlayer.tank.x = data.x;
	movePlayer.tank.y = data.y;
	movePlayer.tank.angle = data.angle;
	movePlayer.tank.vel = data.vel;
	for (i = 0; i < data.turrets.length; i++)
	{
	    movePlayer.turrets[i].turret.rotation = data.turrets[i];
	}
}

var fireRate = 500;
var nextFire = 0;

//Server tells us there is a new enemy movement. We find the moved enemy
//and sync the enemy movement with the server

function onEnemyShot (data) {
    var bullet = enemyBullets.getFirstExists(false);
    bullet.reset(data.x, data.y);
    bullet.position.set(data.p.x, data.p.y);
    bullet.rotation = data.angle;
    bullet.id = data.id;
    var point = new Phaser.Point();
    point.x = data.velocity.x;
    point.y = data.velocity.y;
    //console.log(data.angle, fireRate, point);
    //bullet.body = point;
    bullet.body.velocity = point;
    game.physics.arcade.velocityFromRotation(data.angle, fireRate, bullet.body.velocity);
    game.world.bringToTop(enemyBullets);
}

function onEnemyPoint(data){
	var pointPlayer = findplayerbyid(data.id);
	pointPlayer.points = data.points;
    
    var i = findpositionbyid(data.id);
    leaderboard[i].points = data.points;
    var atTop = false;
    
    //console.log(leaderboard[i].points + " " + leaderboard[i].id);
    do{
        if (i == 0){atTop = true;}
        else if (leaderboard[i].points > leaderboard[i-1].points){
            var temp = leaderboard[i-1];
            leaderboard[i-1] = leaderboard[i];
            leaderboard[i] = temp;
            i = i - 1;
        }
        else if (leaderboard[i].points <= leaderboard[i-1].points){
            atTop = true;
        }
    } while (atTop == false);
}

function onEnemyHit(data) {

}

function gotPoint(){
	points = points + 1;
	socket.emit('got_point', {points: this.points});
    
    var i = findpositionbyid(0);
    leaderboard[i].points = points;
    var atTop = false;
    
    do{
        if (i == 0){atTop = true;
                   console.log("highest part1");}
        else if (leaderboard[i].points > leaderboard[i-1].points){
            var temp = leaderboard[i-1];
            leaderboard[i-1] = leaderboard[i];
            leaderboard[i] = temp;
            i = i - 1;
        }
        else if (leaderboard[i].points <= leaderboard[i-1].points){
            atTop = true;
            console.log("highest part2");
        }
    } while (atTop == false);
}

function findpositionbyid(id){
    for (var i = 0; i < leaderboard.length; i++){
        if(leaderboard[i].id == id){
            return i;
        }
    }
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

function wallsWithBullets(wall, bullet) {
    bullet.kill();
}

function fire (tank) {
    if (game.time.now > nextFire && yourBullets.countDead() > 0)
    {
        for (var i = 0; i < tank.turrets.length; i++) {
            /*nextFire = game.time.now + fireRate;

            var bullet = bullets.getFirstExists(false);

            bullet.reset(tank.turrets[i].turret.world.x, tank.turrets[i].turret.world.y);
            
            bullet.rotation = game.physics.arcade.moveToPointer(bullet, 1000, game.input.activePointer, 500);
            */
            nextFire = game.time.now + fireRate;

            var bullet = yourBullets.getFirstExists(false);

            var theta = tank.turrets[i].turret.angle + tank.tank.angle;
            var p = new Phaser.Point(tank.turrets[i].turret.world.x, tank.turrets[i].turret.world.y);// work out the angle from the centre

            p.rotate(tank.turrets[i].turret.world.x, tank.turrets[i].turret.world.y, theta, true,30); // 30 is distance from centre ...looks like coming out of turret not under tank
            bullet.reset(tank.turrets[i].turret.world.x,tank.turrets[i].turret.world.y);
            var rotation = game.physics.arcade.angleToPointer(bullet);

            // move it to our rotated & shifted point
            bullet.position.set(p.x, p.y);
            bullet.rotation=rotation;
            bullet.id = tank.tank.id;
            console.log(tank);
            console.log(bullet.id, rotation, fireRate, bullet.body.velocity);
            // fire!
            game.physics.arcade.velocityFromRotation(rotation, fireRate, bullet.body.velocity);//500 = speed of bullet
            game.world.bringToTop(yourBullets);
            
            //console.log("x: " + tank.turrets[i].turret.world.x, tank.turrets[i].turret.world.y);
            
            //Sends the bullet to the server.
			socket.emit('bullet_shot', {id: bullet.id, x: tank.turrets[i].turret.world.x, y: tank.turrets[i].turret.world.y, p: p, angle: bullet.rotation, velocity: bullet.body.velocity });
        }
    }

}

main.prototype = {
	preload: function() {
		//game.load.baseURL = 'http://examples.phaser.io/';
		//game.load.crossOrigin = 'anonymous';
		//game.load.atlas('tank', 'assets/tanks.png', 'assets/tanks.json');

		game.load.image('earth', 'assets/earth.png');
        game.load.image('tank','assets/SpaceShooterPack/PNG/playerShip1_red.png');
        game.load.image('turret','assets/SpaceShooterPack/PNG/Parts/gun00.png');
        game.load.image('bullet','assets/SpaceShooterPack/PNG/laserRed02.png');
        game.load.image('wall', 'assets/wall.png');
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

        enemyBullets = game.add.group();
        enemyBullets.enableBody = true;
        enemyBullets.physicsBodyType = Phaser.Physics.ARCADE;
        enemyBullets.createMultiple(30, 'bullet', 0, false);
        enemyBullets.setAll('anchor.x', 0.5);
        enemyBullets.setAll('anchor.y', 0.5);
        enemyBullets.setAll('outOfBoundsKill', true);
        enemyBullets.setAll('checkWorldBounds', true);

        yourBullets = game.add.group();
        yourBullets.enableBody = true;
        yourBullets.physicsBodyType = Phaser.Physics.ARCADE;
        yourBullets.createMultiple(30, 'bullet', 0, false);
        yourBullets.setAll('anchor.x', 0.5);
        yourBullets.setAll('anchor.y', 0.5);
        yourBullets.setAll('outOfBoundsKill', true);
        yourBullets.setAll('checkWorldBounds', true);

		console.log("client started");
	    createPlayer();
        console.log("connected to server"); 
	    gameProperties.in_game = true;
	    // send the server our initial position and tell it we are connected
	    socket.emit('new_player', { x: 0, y: 0, angle: 0, points: 0 });
        
        
	    //socket.on('connect', onsocketConnected); 
	    socket.on("identification", onID);
	    function onID(data) {
	        console.log("IDDATA" + data);
	        player.tank.id = data;
	    }
	    socket.on("mapData", onMapData);
		//listen to new enemy connections
		socket.on("new_enemyPlayer", onNewPlayer);
		//listen to enemy movement 
		socket.on("enemy_move", onEnemyMove);
		//listen to enemy shots
		socket.on("new_enemyShot", onEnemyShot);
		// when received remove_player, remove the player passed; 
		socket.on('remove_player', onRemovePlayer); 
        
		socket.on('enemy_point', onEnemyPoint);
		socket.on('enemy_hit', onEnemyHit);
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


            //if (player.tank.body.angularVelocity != 0 || player.tank.vel != 0){
		    //Send a new position data to the server 
		    moveData = { x: player.tank.x, y: player.tank.y, angle: player.tank.angle, vel: player.tank.vel };
		    moveData.turrets = [];
		    //console.log(player.turrets[0].turret.rotation);
		    for (i = 0; i < player.turrets.length; i++)
		    {
		        moveData.turrets[i] = player.turrets[i].turret.rotation;
		    }
			     socket.emit('move_player', moveData);
            //}
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

		    player.update("player");
		    for (i = 0; i < enemies.length; i++)
		    {
		        enemies[i].update("enemy");
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
            
            if (game.input.activePointer.isDown)
            {
                fire(player);
            }

            game.physics.arcade.overlap(walls, enemyBullets, wallsWithBullets, null, this);
            game.physics.arcade.overlap(walls, yourBullets, wallsWithBullets, null, this);
		}
	},

	render: function(){
		game.debug.text("Your Score", 50, 50);
		game.debug.text(points, 450, 50);
		for (var i = 0; i < leaderboard.length && i < 5; i++){
			game.debug.text(leaderboard[i].id, 100, i * 50 + 100);
			game.debug.text(leaderboard[i].points, 500, i * 50 + 100);
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