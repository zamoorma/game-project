var socket; 
socket = io.connect();


game = new Phaser.Game(window.innerWidth,window.innerHeight, Phaser.AUTO, 'gameDiv');

//the enemy player list 
var enemies = [];
var id;
var points;

var shots = [];
var leaderboard = [];

var $window = $(window);
var $nameInput = $('.nameInput');
var $currentInput = $nameInput.focus();

var $startPage = $('.start.page');
var $gamePage = $('.game.page');
var $endPage = $('.end.page');

var cursors;
var xVel;
var yVel;
var land;
var walls;
var name;

var player;

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
	gameProperties.in_game = true;
}



// login page ---------------------

function getServerIP(data){
    console.log("Server IP: "+data);
    document.getElementById("IP").innerHTML += data + ":2000/client/index.html";
    
}

function setName(){
    name = cleanInput($nameInput.val());
    console.log("Your name is "+name);
    
    if (name){
        $startPage.fadeOut();
        $gamePage.fadeIn();
        $startPage.off('click');
        //$currentInput = $inputMessage.focus();
        // send the server our initial position and tell it we are connected
        //socket.emit('new_player', {x: 0, y: 0, angle: 0});
        //createPlayer();
        
        console.log("client started");
	    createPlayer(name);
        console.log("connected to server"); 
	    gameProperties.in_game = true;
	    // send the server our initial position and tell it we are connected
	    socket.emit('new_player', { x: 0, y: 0, angle: 0, points: 0, name: name});
    }
}

$startPage.click(function(){
    $currentInput.focus();
});

$window.keydown(function (event) {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
        setName();
    }
  });

function cleanInput (input) {
    return $('<div/>').text(input).text();
  }


// game page -----------------


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

function createPlayer (name) {
    player = new Tank(0, 128 + 256 + 512 * Math.floor(Math.random() * 7), 128 + 256 + 512 * Math.floor(Math.random() * 7), 0,0,name);
    //player = new Tank(id, 300, 300, 0,0,name);
    cameraFocus = game.add.sprite(0, 0);
    game.camera.follow(cameraFocus);
    leaderboard.push(new Score(0, 0, name));
}

function Score(id, p, name){
    this.points = p;
    this.id = id;
    this.name = name;
}

//function Wall(x, y) {
//    this.wall = game.add.sprite(x, y, 'wall');
//    this.wall.anchor.setTo(0, 0);
//    game.physics.enable(this.wall, Phaser.Physics.ARCADE);
//    this.wall.vel = 0;
//}

function Tank(id, x, y, r, p, name) {
    this.name = name;
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
    this.tank.id = this.id;
    this.tank.health = 100;
    this.tank.maxHealth = this.tank.health;

    this.turrets = new Array();

    this.turrets.push(new Turret(this.tank, -20, 0, 0));
    //console.log(this.turrets);
}

Tank.prototype.update = function () {
    game.physics.arcade.velocityFromAngle(this.tank.angle, this.tank.vel, this.tank.body.velocity);
    game.physics.arcade.collide(this.tank, walls);
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
    console.log(data)
	var new_enemy = new Tank(data.id, data.x, data.y, data.angle, data.points, data.name);
	enemies.push(new_enemy);
    var new_score = new Score(data.id, data.points, data.name);
    leaderboard.push(new_score);
    
    i = leaderboard.length - 1;
    console.log(i);
    var atTop = false;
    do{
        if (i == 0){atTop = true;
                   //console.log("highest part1");
                   }
        else if (leaderboard[i].points > leaderboard[i-1].points){
            var temp = leaderboard[i-1];
            leaderboard[i-1] = leaderboard[i];
            leaderboard[i] = temp;
            i = i - 1;
        }
        else if (leaderboard[i].points <= leaderboard[i-1].points){
            atTop = true;
            //console.log("highest part2");
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
    //console.log(data.id+" shot");
    var bullet = bullets.getFirstExists(false);
    bullet.id = data.id;
    //console.log("ID "+bullet.id);
    bullet.reset(data.x, data.y);
    bullet.position.set(data.p.x, data.p.y);
    bullet.rotation = data.angle;
    
    //console.log(data.angle, fireRate, point);
    //bullet.body = point;
    bullet.body.velocity.x = data.velocity.x;
    bullet.body.velocity.y = data.velocity.y;

    game.physics.arcade.velocityFromRotation(data.angle, fireRate, bullet.body.velocity);
    game.world.bringToTop(bullets);
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

function gotPoint(gain){
	points = points + gain;
	socket.emit('got_point', {points: this.points});
    
    var i = findpositionbyid(0);
    leaderboard[i].points = points;
    var atTop = false;
    
    do{
        if (i == 0){atTop = true;
                   //console.log("highest part1");
                   }
        else if (leaderboard[i].points > leaderboard[i-1].points){
            var temp = leaderboard[i-1];
            leaderboard[i-1] = leaderboard[i];
            leaderboard[i] = temp;
            i = i - 1;
        }
        else if (leaderboard[i].points <= leaderboard[i-1].points){
            atTop = true;
            //console.log("highest part2");
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

function defineID(servid){
    id = servid;
    console.log("My ID is "+id);
}

function onEnemyDamage(data){
    if (data.bulletid == id)
        gotPoint(10);
    var damaged = findplayerbyid(data.playerid);
    damaged.tank.health -= 10;
}

function onEnemyDeath(data){
    if (data.bulletid == id)
        gotPoint(data.points);
}

function fire (tank) {
    if (game.time.now > nextFire && bullets.countDead() > 0)
    {
        for (var i = 0; i < tank.turrets.length; i++) {
            /*nextFire = game.time.now + fireRate;

            var bullet = bullets.getFirstExists(false);

            bullet.reset(tank.turrets[i].turret.world.x, tank.turrets[i].turret.world.y);
            
            bullet.rotation = game.physics.arcade.moveToPointer(bullet, 1000, game.input.activePointer, 500);
            */
            nextFire = game.time.now + fireRate;

            var bullet = bullets.getFirstExists(false);
            bullet.id = id;

            var theta = tank.turrets[i].turret.angle + tank.tank.angle;
            var p = new Phaser.Point(tank.turrets[i].turret.world.x, tank.turrets[i].turret.world.y);// work out the angle from the centre

            p.rotate(tank.turrets[i].turret.world.x, tank.turrets[i].turret.world.y, theta, true,30); // 30 is distance from centre ...looks like coming out of turret not under tank
            bullet.reset(tank.turrets[i].turret.world.x,tank.turrets[i].turret.world.y);
            var rotation = game.physics.arcade.angleToPointer(bullet);

            // move it to our rotated & shifted point
            bullet.position.set(p.x, p.y);
            bullet.rotation=rotation;
            
            //console.log(rotation, fireRate, bullet.body.velocity);
            // fire!
            game.physics.arcade.velocityFromRotation(rotation, fireRate, bullet.body.velocity);//500 = speed of bullet
            game.world.bringToTop(bullets);
            
            //console.log("x: " + tank.turrets[i].turret.world.x, tank.turrets[i].turret.world.y);
            
            //Sends the bullet to the server.
			socket.emit('bullet_shot', {id: tank.id, x: p.x, y: p.y, p: p, angle: bullet.rotation, velocity: bullet.body.velocity });

        }
    }
}

function onWallHit(bullet, wall){
    //console.log("Wall Shot");
    bullet.kill();
}

function onDamage(splayer, bullet){
    //console.log(splayer);
    //console.log("player: "+splayer.id+" bullet: "+bullet.id)
    if (splayer.id != bullet.id){
        bullet.kill();
        if (splayer.id == id){
            splayer.health -= 10;
            socket.emit("took_damage", {playerid: splayer.id, bulletid: bullet.id});
            if (splayer.health <= 0) {
                document.getElementById("score").innerHTML = "Score: " + points;
                socket.emit("died", {bulletid: bullet.id, points: points});
                socket.disconnect();
                $gamePage.fadeOut();
                $endPage.fadeIn();
            }
        }
    }
}

main.prototype = {
	preload: function() {
        console.log("Preloading");
		//game.load.baseURL = 'http://examples.phaser.io/';
		//game.load.crossOrigin = 'anonymous';
		//game.load.atlas('tank', 'assets/tanks.png', 'assets/tanks.json');

		game.load.image('earth', '../assets/earth.png');
        game.load.image('tank','../assets/SpaceShooterPack/PNG/playerShip1_red.png');
        game.load.image('turret','../assets/SpaceShooterPack/PNG/Parts/gun00.png');
        game.load.image('bullet','../assets/SpaceShooterPack/PNG/laserRed02.png');
        game.load.image('wall', '../assets/wall.png');
    //game.load.atlasXML('tank','assets/SpaceShooterPack/Spritesheet/sheet.png','assets/SpaceShooterPack/Spritesheet/sheet.xml');
    },
	
	create: function () {
        socket.emit("ask_ip", 1);
        
        game.time.advancedTiming = true;
        //game.forceSingleUpdate = false;
        game.stage.disableVisibilityChange = true;
		game.scale.scaleMode = Phaser.ScaleManager.RESIZE;
		game.physics.startSystem(Phaser.Physics.P2JS);
		//game.physics.p2.setBoundsToWorld(false, false, false, false, false)
		game.physics.p2.gravity.y = 0;
		game.physics.p2.applyGravity = false; 
		game.physics.p2.enableBody(game.physics.p2.walls, false); 
        //game.physics.p2.enableBody(game.physics.p2.enemies, false); 
        // physics start system
		//game.physics.p2.setImpactEvents(true);
        
        game.world.setBounds(0, 0, gameProperties.gameWidth, 
        gameProperties.gameHeight, false, false, false, false);
        
		land = game.add.tileSprite(0, 0, window.innerWidth, window.innerHeight, 'earth');
		land.fixedToCamera = true;

        bullets = game.add.group();
        bullets.enableBody = true;
        bullets.physicsBodyType = Phaser.Physics.ARCADE;
        bullets.createMultiple(30, 'bullet', 0, false);
        bullets.setAll('anchor.x', 0.5);
        bullets.setAll('anchor.y', 0.5);
        bullets.setAll('outOfBoundsKill', true);
        bullets.setAll('checkWorldBounds', true);

		//console.log("client started");
	    //createPlayer();
        //console.log("connected to server"); 
	    //gameProperties.in_game = true;
	    // send the server our initial position and tell it we are connected
	    //socket.emit('new_player', { x: 0, y: 0, angle: 0, points: 0 });
        
        
		//socket.on('connect', onsocketConnected); 
	    socket.on("mapData", onMapData);
		//listen to new enemy connections
		socket.on("new_enemyPlayer", onNewPlayer);
		//listen to enemy movement 
		socket.on("enemy_move", onEnemyMove);
		//listen to enemy shots
		socket.on("new_enemyShot", onEnemyShot);
		// when received remove_player, remove the player passed; 
		socket.on('remove_player', onRemovePlayer); 
        
		socket.on('updateHit', onEnemyDamage);
        
        socket.on('server_ip', getServerIP);
        
        socket.on('your_id', defineID);
        
        socket.on('enemy_point', onEnemyPoint);
        
        socket.on('updateDeath', onEnemyDeath);
        //game.camera.follow(player);
        cursors = game.input.keyboard.addKeys({ 'w': Phaser.KeyCode.W, 's': Phaser.KeyCode.S, 'a': Phaser.KeyCode.A, 'd': Phaser.KeyCode.D, 'up': Phaser.KeyCode.UP, 'down': Phaser.KeyCode.DOWN, 'left': Phaser.KeyCode.LEFT, 'right': Phaser.KeyCode.RIGHT });
		points = 0;
        
        
	},
	
	update: function () {
		// emit the player input
        
		//move the player when the player is made 
		if (gameProperties.in_game) {
            this.physics.arcade.overlap(bullets, walls, onWallHit, null, this);
            
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

		    player.update();
            this.physics.arcade.overlap(bullets, player.tank, onDamage, null, this);
		    for (i = 0; i < enemies.length; i++)
		    {
		        enemies[i].update();
                this.physics.arcade.overlap(bullets, enemies[i].tank, onDamage, null, this);
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

			/*if (cursors.right.isDown) {
			    gotPoint(1);
			}*/

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

		}
	},

	render: function(){
        
        game.debug.text(game.time.fps, 10, 20);
        
        if (player)
        {
            var leaderboardsX = window.innerWidth + game.camera.x - 250;
            var leaderboardsY = game.camera.y;
            
            //leaderboards
            game.debug.geom(new Phaser.Rectangle(leaderboardsX, leaderboardsY, 250, 400),'rgba(150, 255, 0, 0.2)');

            game.debug.text(player.name, window.innerWidth - 220, 30);
            game.debug.text(points, window.innerWidth - 100, 30);

            for (var i = 0; i < leaderboard.length && i < 5; i++){
                game.debug.text(leaderboard[i].name, window.innerWidth - 220, i * 50 + 100);
                game.debug.text(leaderboard[i].points,  window.innerWidth - 100, i * 50 + 100);
            }
            //user's background health bar
            game.debug.geom(new Phaser.Rectangle(player.tank.x - player.tank.maxHealth, player.tank.y - 90, player.tank.maxHealth * 2, 30),'rgba(100, 100, 100, 0.4)');
        
            //healthbar
            if (player.tank.health > 0)
            game.debug.geom(new Phaser.Rectangle(player.tank.x - player.tank.maxHealth, player.tank.y - 90, player.tank.health * 2, 30),'rgba(0, 255, 0, 0.8)');
            
            //user's name
            game.debug.text(player.name, player.tank.x - (name.length*5 + game.camera.x), player.tank.y - (70 + game.camera.y));
            for (i = 0; i < enemies.length;i++)
            {
                //background health bar
                game.debug.geom(new Phaser.Rectangle(enemies[i].tank.x - enemies[i].tank.maxHealth, enemies[i].tank.y - 90, 200, 30),'rgba(100, 100, 100, 0.4)');

                //healthbar
                if (enemies[i].tank.health > 0)
                    game.debug.geom(new Phaser.Rectangle(enemies[i].tank.x - enemies[i].tank.maxHealth, enemies[i].tank.y - 90, enemies[i].tank.health * 2, 30),'rgba(0, 255, 0, 0.8)');

                //enemy name 
                game.debug.text(enemies[i].name, enemies[i].tank.x - (enemies[i].name.length*5 + game.camera.x), enemies[i].tank.y - (70 + game.camera.y));
            }
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