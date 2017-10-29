function createMaze(height, width)
{
    var maze = new Array(height);
    for (var i = 0; i < height; i++) {
        maze[i] = new Array(width).fill(1);
    }
    startingPoint = [Math.floor(height / 2), Math.floor(width / 2)];
    currentPoint = startingPoint;
    maze[currentPoint[0]][currentPoint[1]] = 2;
    maze[currentPoint[0]+1][currentPoint[1]] = 0;
    maze[currentPoint[0]-1][currentPoint[1]] = 0;
    maze[currentPoint[0]][currentPoint[1]+1] = 0;
    maze[currentPoint[0]][currentPoint[1]-1] = 0;
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

console.log(createMaze(15, 15));