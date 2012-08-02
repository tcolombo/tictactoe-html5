//*** Gestion du son
function sound_stop(event)
{
  if (event.target.currentTime > event.target.endTime)
  {
    event.target.pause();
    event.target.removeEventListener('timeupdate', sound_stop, false); 
  }
};

function sound_play(sound, interval)
{
  sound.currentTime = interval[0]; 
  sound.endTime     = interval[1];
  sound.addEventListener('timeupdate', sound_stop, false); 
  sound.play();
};

function reconnect_server()
{
  $.getScript('http://localhost:3000/socket.io/socket.io.js');
  connect_server();
};

function connect_server()
{
  var socket = null;

  try
  {
    socket = io.connect('http://localhost:3000');
    $('#notification').hide();
    main_loop(socket);
  }
  catch (error)
  {
    console.log('Connexion au serveur impossible');
    notify('Tentative de connexion au serveur (' + 
           connect_server.cpt++ + ')...<br /><br />' +
           '<progress max="100"></progress>');
    setTimeout(reconnect_server, 5000);
  }  
};

function notify(msg)
{
  $('#notification').html(msg);
  $('#notification').show();
};

function getCol(strCase)
{
  return strCase[2]-1;
};

function getRow(strCase)
{
  return strCase[1]-1;
};

function saveScore()
{
  var save = { 
    score: $('#score').val(),
    name:  $('#name').val()
  };

  localStorage['bestScore'] = JSON.stringify(save);
  $('#theScore').html('');

  return false;
};

function isBestScore(score)
{
  var getName = '<span id="theScore">' +
                '<form onsubmit="return saveScore();">' +
                'Votre nom : <input type="text" id="name" /><br />' +
                '<input type="hidden" id="score" value="' + score + '" />' +
                '<input type="submit" value="Ok" />' +
                '</form>' +
                '</span>';

  if (localStorage['bestScore'])
  {
    var bestScore = JSON.parse(localStorage['bestScore']);

    if (score < bestScore.score)
    {
      return 'Vous avez réalisé le meilleur score (' + score + ') !<br />' +
             getName;
    }
    else
    {
      return 'Meilleur score : ' + bestScore.name + ' (' + bestScore.score + 
             ')';
    }
  }
  else
  {
    return 'Vous avez réalisé le meilleur score (' + score + ') !<br />' +
           getName;
  }
};

function main_loop(socket)
{
  // *** Gestion du serveur
  socket.on('connected', function (msg) 
    {
      console.log('Connecté au serveur avec l\'id ' + msg.data);
    }
  );

  socket.on('server', function (data)
    {
      console.log('Le serveur joue en (' + data.row + ',' + data.col + ')');
      console.log('#c' + data.row + data.col);
      $('#c' + data.row + '' + data.col).append('<div class="token_auto"></div>');
      $('#c' + data.row + '' + data.col).unbind('dragover dragleave drop');
    }
  );

  socket.on('cheater', function ()
    {
      console.log('Arrêt du jeu pour triche (sans message d\'avertissement '
                  + 'pour le tricheur)');
      socket.disconnect();
    }
  );
      
  socket.on('endgame', function (data)
    {
      var bestScore = isBestScore(data.score);

      console.log('Fin de partie');
      if (data.status == 0)
      {
        console.log('Egalité!');
        notify('Egalité... recommencez !<br />' + bestScore);
      }
      else if (data.status == 1)
      {
        console.log('Gagné!');
        notify('Bravo, vous avez gagné !<br />' + bestScore);
        if ($('#name'))
        {
          $('#name').focus();
        }
        sound_play(sound, sound_sprites['winner']);
      }
      else
      {
        console.log('Perdu!');
        notify('Ooops... perdu !<br />' + bestScore);
        if ($('#name'))
        {
          $('#name').focus();
        }
        sound_play(sound, sound_sprites['looser']);
      }
  
      //*** On rend les jetons non déplacables
      for (var i=1; i<=5; i++)
      {
        $('#t_' + i).removeClass('draggable');
      };
      $('#tokens').unbind('dragstart');

      // Déconnexion du serveur
      socket.disconnect();
    }
  );

  //*** Définition des sprites de son
  var sound = document.getElementById('game_sounds');
  var sound_sprites = {
    'drag':   [ 0, 0.2 ],
    'drop':   [ 1, 1.7 ],
    'winner': [ 3, 11 ],
    'looser': [ 12, 13 ]
  };


  //*** On rend les jetons déplacables
  for (var i=1; i<=5; i++)
  {
    $('#t_' + i).attr('draggable', 'true');
    $('#t_' + i).addClass('draggable');
  };

  //*** On active le déplacement des jetons
  // Si la propriété dataTransfer n'est pas ajoutée, impossible d'y accéder
  $.event.props.push('dataTransfer');

  $('#tokens').bind({
    dragstart: function (event)
               {
                 console.log('Début de déplacement de ' + 
                             $(event.target).attr('id'));
                 sound_play(sound, sound_sprites['drag']);
                 event.dataTransfer.effectAllowed = 'move';
                 event.dataTransfer.setData("Text", 
                                            $(event.target).attr('id'));
               }
    }
  );

  // Déclaration des zones de larguage
  for (var i=1; i<=3; i++)
  {
    for (var j=1; j<=3; j++)
    {
      $('#c' + i + j).bind({
        dragover:  function (event)
                   {
                     console.log('Passage au dessus de ' + 
                                 $(event.target).attr('id'));
                     $(event.target).addClass('overCase');
                     return false;
                   },
        dragleave: function (event)
                   {
                     $(event.target).removeClass('overCase');
                     return false;
                   },
        drop:      function (event)
                   {
                     var elt = event.dataTransfer.getData('Text');
                     var cible = $(event.target).attr('id');
                        
                     console.log('Larguage de ' + elt + ' sur ' + cible);
                     sound_play(sound, sound_sprites['drop']);
                     $(event.target).append($('#' + elt));
                     event.stopPropagation();
                        
                     // On supprime l'effet de pointeur
                     $('#' + elt).removeClass('draggable');
                     $(event.target).removeClass('overCase');

                     // On envoie au serveur la position du pion joué
                     socket.emit('played', { col: getCol(cible), 
                                             row: getRow(cible) });

                     return false;
                   }
        }
      );
    }
  }
};

$(document).ready(function()
  {
    //*** Connexion au serveur
    connect_server.cpt = 1;
    connect_server();
  }
);
