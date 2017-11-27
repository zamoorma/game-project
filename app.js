var express = require('express');

var app = express();
var serv = require('http').Server(app);

app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));
app.use('/assets', express.static(__dirname + '/assets'));

serv.listen(process.env.PORT || 2000);
console.log("Server started.");

var player_lst = [];
var wallLocations = createMaze(15, 15)
console.log(wallLocations);

//a player class in the server
var Player = function (startX, startY, startAngle, startPoints) {
  this.x = startX
  this.y = startY
  this.angle = startAngle
  this.points = startPoints
  this.vel = 0;
  this.turrets = [];
}

//a bullet class in the server
var Bullet = function (shotID, startX, startY, startP, startAngle, Velocity) {
  this.id = shotID
  this.x = startX
  this.y = startY
  this.p = startP
  this.angle = startAngle
  this.velocity = Velocity
}

// when a new player connects, we make a new instance of the player object,
// and send a new player message to the client. 
function onNewplayer (data) {
	console.log(data);
	//new player instance
	console.log(data.points);
	var newPlayer = new Player(data.x, data.y, data.angle, data.points);
	console.log(newPlayer);
	console.log("created new player with id " + this.id);
	newPlayer.id = this.id;
	this.emit("identification", newPlayer.id);
	this.emit("mapData", wallLocations);
	//information to be sent to all clients except sender
	var current_info = {
		id: newPlayer.id, 
		x: newPlayer.x,
		y: newPlayer.y,
		angle: newPlayer.angle,
		points: newPlayer.points,
	}; 
	
	//send to the new player about everyone who is already connected. 	
	for (i = 0; i < player_lst.length; i++) {
		existingPlayer = player_lst[i];
		var player_info = {
			id: existingPlayer.id,
			x: existingPlayer.x,
			y: existingPlayer.y, 
			angle: existingPlayer.angle,
			points: existingPlayer.points,			
		};
		console.log("pushing player");
		//send message to the sender-client only
		this.emit("new_enemyPlayer", player_info);
        
	}
	
	//send message to every connected client except the sender
	this.broadcast.emit('new_enemyPlayer', current_info);
	
	player_lst.push(newPlayer); 

}
//update the bullet and send the information back to every client except sender
function onBulletShot (data) {
    //console.log(data);
	//new player instance
	//console.log(data.points);
	var newShot = new Bullet(data.id, data.x, data.y, data.p, data.angle, data.velocity);
	//information to be sent to all clients except sender
	var current_info = {
		id: newShot.id, 
		x: newShot.x,
		y: newShot.y,
        p: newShot.p,
		angle: newShot.angle,
		velocity: newShot.velocity,
	}; 
	/*
	//send to the new player about everyone who is already connected. 	
	for (i = 0; i < player_lst.length; i++) {
		existingPlayer = player_lst[i];
		var player_info = {
			id: existingPlayer.id,
			x: existingPlayer.x,
			y: existingPlayer.y, 
			angle: existingPlayer.angle,
			points: existingPlayer.points,			
		};
		console.log("pushing player");
		//send message to the sender-client only
		this.emit("new_enemyPlayer", player_info);
	}
    */
	
	//send message to every connected client except the sender
    //console.log(current_info);
	this.broadcast.emit('new_enemyShot', current_info);
}

//update the player position and send the information back to every client except sender
function onMovePlayer (data) {
	var movePlayer = find_playerid(this.id); 
	movePlayer.x = data.x;
	movePlayer.y = data.y;
	movePlayer.angle = data.angle; 
	movePlayer.vel = data.vel;
	movePlayer.turrets = data.turrets;
	var moveplayerData = {
	    id: movePlayer.id,
	    x: movePlayer.x,
	    y: movePlayer.y, 
	    angle: movePlayer.angle,
	    vel: movePlayer.vel,
        turrets: movePlayer.turrets
	}
	
	//send message to every connected client except the sender
	this.broadcast.emit('enemy_move', moveplayerData);
}

//call when a client disconnects and tell the clients except sender to remove the disconnected player
function onClientdisconnect() {
	console.log('disconnect'); 

	var removePlayer = find_playerid(this.id); 
		
	if (removePlayer) {
		player_lst.splice(player_lst.indexOf(removePlayer), 1);
	}
	
	console.log("removing player " + this.id);
	
	//send message to every connected client except the sender
	this.broadcast.emit('remove_player', {id: this.id});
	
}

// find player by the the unique socket id 
function find_playerid(id) {
	for (var i = 0; i < player_lst.length; i++) {
		if (player_lst[i].id == id) {
			return player_lst[i]; 
		}
	}
	console.log(id + " not found in " + playerlst);
	return false; 
}

function onGetPoint(data){
	var pointID = find_playerid(this.id);
	pointID.points = data.points;
	//var points = find_playerid(this.id).points;
	//console.log(pointID.id+" has "+data.points+" points");
	this.broadcast.emit('enemy_point', {id: pointID.id, points: data.points});
}

function onGetHit(data) {
    var damagedPlayer = find_playerid(this.id);
    //TODO damagedPlayer.health--;
    var damager = find_playerid(data.ownerID);
    //console.log(data.ownerID);
    console.log(damager);
    damager.points++;
    this.broadcast.emit('enemy_point', { id: damager.id, points: damager.points });
}

function createMaze(height, width) {
    var maze = new Array(height);
    for (var i = 0; i < height; i++) {
        maze[i] = new Array(width).fill(1);
    }
    startingPoint = [Math.floor(height / 2), Math.floor(width / 2)];
    currentPoint = startingPoint;
    maze[currentPoint[0]][currentPoint[1]] = 2;
    maze[currentPoint[0] + 1][currentPoint[1]] = 0;
    maze[currentPoint[0] - 1][currentPoint[1]] = 0;
    maze[currentPoint[0]][currentPoint[1] + 1] = 0;
    maze[currentPoint[0]][currentPoint[1] - 1] = 0;
    while (maze[startingPoint[0]][startingPoint[1]] == 2) {
        deadEnds = false;
        //go until you reach a dead end
        while (true) {
            eligiblePaths = [];
            if (currentPoint[0] + 2 < height) {
                if (maze[currentPoint[0] + 2][currentPoint[1]] == 1) {
                    eligiblePaths.push("up");
                }
            }
            if (currentPoint[0] - 2 >= 0) {
                if (maze[currentPoint[0] - 2][currentPoint[1]] == 1) {
                    eligiblePaths.push("down");
                }
            }
            if (currentPoint[1] + 2 < width) {
                if (maze[currentPoint[0]][currentPoint[1] + 2] == 1) {
                    eligiblePaths.push("right");
                }
            }
            if (currentPoint[1] - 2 < width) {
                if (maze[currentPoint[0]][currentPoint[1] - 2] == 1) {
                    eligiblePaths.push("left");
                }
            }
            if (eligiblePaths.length == 0) break;
            direction = eligiblePaths[Math.floor(Math.random() * eligiblePaths.length)];
            if (direction == "up") {
                maze[currentPoint[0] + 1][currentPoint[1]] = 2;
                maze[currentPoint[0] + 2][currentPoint[1]] = 2;
                currentPoint = [currentPoint[0] + 2, currentPoint[1]];
            }
            if (direction == "down") {
                maze[currentPoint[0] - 1][currentPoint[1]] = 2;
                maze[currentPoint[0] - 2][currentPoint[1]] = 2;
                currentPoint = [currentPoint[0] - 2, currentPoint[1]];
            }
            if (direction == "right") {
                maze[currentPoint[0]][currentPoint[1] + 1] = 2;
                maze[currentPoint[0]][currentPoint[1] + 2] = 2;
                currentPoint = [currentPoint[0], currentPoint[1] + 2];
            }
            if (direction == "left") {
                maze[currentPoint[0]][currentPoint[1] - 1] = 2;
                maze[currentPoint[0]][currentPoint[1] - 2] = 2;
                currentPoint = [currentPoint[0], currentPoint[1] - 2];
            }
            deadEnds = true;
        }

        //remove the dead end
        if (deadEnds) {
            eligiblePaths = [];
            if (currentPoint[0] + 2 < height) {
                if (maze[currentPoint[0] + 2][currentPoint[1]] == 2 && maze[currentPoint[0] + 1][currentPoint[1]] == 1) {
                    eligiblePaths.push("up");
                }
            }
            if (currentPoint[0] - 2 >= 0) {
                if (maze[currentPoint[0] - 2][currentPoint[1]] == 2 && maze[currentPoint[0] - 1][currentPoint[1]] == 1) {
                    eligiblePaths.push("down");
                }
            }
            if (currentPoint[1] + 2 < width) {
                if (maze[currentPoint[0]][currentPoint[1] + 2] == 2 && maze[currentPoint[0]][currentPoint[1] + 1] == 1) {
                    eligiblePaths.push("right");
                }
            }
            if (currentPoint[1] - 2 < width) {
                if (maze[currentPoint[0]][currentPoint[1] - 2] == 2 && maze[currentPoint[0]][currentPoint[1] - 1] == 1) {
                    eligiblePaths.push("left");
                }
            }

            if (eligiblePaths.length > 0) {
                direction = eligiblePaths[Math.floor(Math.random() * eligiblePaths.length)];
                if (direction == "up") {
                    maze[currentPoint[0] + 1][currentPoint[1]] = 0;
                }
                if (direction == "down") {
                    maze[currentPoint[0] - 1][currentPoint[1]] = 0;
                }
                if (direction == "right") {
                    maze[currentPoint[0]][currentPoint[1] + 1] = 0;
                }
                if (direction == "left") {
                    maze[currentPoint[0]][currentPoint[1] - 1] = 0;
                }
            }
        }

        //backtrack once
        maze[currentPoint[0]][currentPoint[1]] = 0;

        if (currentPoint[0] + 2 < height && maze[currentPoint[0] + 1][currentPoint[1]] == 2) {
            maze[currentPoint[0] + 1][currentPoint[1]] = 0;
            currentPoint = [currentPoint[0] + 2, currentPoint[1]];
        }
        else if (currentPoint[0] - 2 >= 0 && maze[currentPoint[0] - 1][currentPoint[1]] == 2) {
            maze[currentPoint[0] - 1][currentPoint[1]] = 0;
            currentPoint = [currentPoint[0] - 2, currentPoint[1]];
        }
        else if (currentPoint[1] + 2 < width && maze[currentPoint[0]][currentPoint[1] + 1] == 2) {
            maze[currentPoint[0]][currentPoint[1] + 1] = 0;
            currentPoint = [currentPoint[0], currentPoint[1] + 2];
        }
        else if (currentPoint[1] - 2 < width && maze[currentPoint[0]][currentPoint[1] - 1] == 2) {
            maze[currentPoint[0]][currentPoint[1] - 1] = 0;
            currentPoint = [currentPoint[0], currentPoint[1] - 2];
        }
    }
    return maze;
}

 // io connection 
var io = require('socket.io')(serv,{});

io.sockets.on('connection', function(socket){
	console.log("socket connected"); 
	
	// listen for disconnection; 
	socket.on('disconnect', onClientdisconnect); 
	
	// listen for new player
	socket.on("new_player", onNewplayer);
	// listen for player position update
	socket.on("move_player", onMovePlayer);
    socket.on("bullet_shot", onBulletShot);
    socket.on("got_point", onGetPoint);
    socket.on("got_hit", onGetHit);
});


