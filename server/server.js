var io = require('socket.io').listen(3000);

function randint(min, max)
{
   return Math.round(min + Math.random() * (max - min))
};

function displayGame(game)
{
  for (var i=0; i<3; i++)
  {
    var row = '';
    for (var j=0; j<3; j++)
    {
      row += game.array[i][j] + ' ';
    }
    console.log(row);
  }
};

function testWinner(game, player, socket)
{
  var winValue = 3 * player;
  var sum;

  if (game.cpt < 5)
  {
    return false;
  }

  // Test des lignes
  for (var row=0; row<3; row++)
  {
    sum = 0;
    for (var col=0; col<3; col++)
    {
      sum += game.array[row][col];
    }
    if (sum == winValue)
    {
      socket.emit('endgame', { 'status': player, 'score' : game.cpt });
      return true;
    }
  }
  
  // Test des colonnes
  for (var col=0; col<3; col++)
  {
    sum = 0;
    for (var row=0; row<3; row++)
    {
      sum += game.array[row][col];
    }
    if (sum == winValue)
    {
      socket.emit('endgame', { 'status': player, 'score' : game.cpt });
      return true;
    }
  }

  // Test des diagonales
  sum = game.array[0][0] + game.array[1][1] + game.array[2][2];
  if (sum == winValue)
  {
    socket.emit('endgame', { 'status': player, 'score' : game.cpt });
    return true;
  }
  sum = game.array[2][0] + game.array[1][1] + game.array[0][2];
  if (sum == winValue)
  {
    socket.emit('endgame', { 'status': player, 'score' : game.cpt });
    return true;
  }

  // Match nul
  if (game.cpt == 9)
  {
    socket.emit('endgame', { 'status': 0 });
    return true;
  }

  return false;
}

function playHuman(game, row, col, socket)
{
  game.array[row][col] = 1;
  game.cpt++;
  return testWinner(game, 1, socket);
};

function playServer(game, socket)
{
  var col;
  var row;

  do
  {
    col = randint(0, 2);
    row = randint(0, 2);
  } while (game.array[row][col] != 0);

  game.array[row][col] = -1;
  game.cpt++;
  socket.emit('server', { row: row + 1, col: col + 1 });
  return testWinner(game, -1, socket);
};

io.sockets.on('connection', function (socket) 
  {
    // Actions à effectuer à la connection
    console.log('>>> Nouveau joueur ' + socket.id);
    socket.emit('connected', { data : socket.id });

    var game = {
      array: [
               [0, 0, 0],
               [0, 0, 0],
               [0, 0, 0]
             ],
      cpt:   0
    };

    socket.on('disconnect', function () 
      {
        console.log('>>> Perte de la connexion avec le joueur ' + socket.id);
      }
    );
    
    socket.on('played', function (data) 
      {
        console.log('>>> Jeu en (' + data.row + ', ' + data.col + ') pour ' +
                    'le joueur ' + socket.id);
        if (game.array[data.row][data.col] != 0)
        {
          socket.emit('cheater');
        }
        else
        {
          playHuman(game, data.row, data.col, socket);
          displayGame(game);
          playServer(game, socket);
        }
      }
    );
  }
);
