var client = require('socket.io').listen('8080').sockets;


var usernames = {};
var rooms = [];

rooms[0] = 'Main';

client.on('connection', function(socket){
       
    //Status
    sendStatus = function(s) {
       	socket.emit('status', s);
    };

    //Add user to defaul room
    socket.on("addUser", function(username) {
    	socket.username = username;
	    
	    sendStatus(username+' was connected to chat!');

	    //Set default room for new  user
	    socket.room = rooms[0];
        currRoom = socket.room;

		//save the user
		usernames[username] = username;
		
        //join to room 
		socket.join(socket.room);

		//emit, to the client, you've connected
		updateClient(socket, username, socket.room);

		//emit to the room, a person has connected
		updateChatRoom(socket, 'connected');
		updateRoomList(socket, socket.room);	
    });


    //take in the message, emit it
    socket.on('sendChat', function (data) {
		var whitespaceParrent = /^\s*$/;
        
		if(whitespaceParrent.test(socket.username)|| whitespaceParrent.test(data)) {
		    sendStatus('Name and message required!');
		}else{
			//Send the message to everyone in room
         	client.in(socket.room).emit('updateChat', socket.username, data);
				
			//Send status
			sendStatus({ 
		    	message : 'Message sent!',
		    	clear : true
			});         	
        } 	
    });

    //when we switch a room
    socket.on('switchRoom', function(newRoom) {
        //Leve old room and join to new room
        socket.leave(socket.room);
        socket.join(newRoom.room);

        //update client
        updateClient(socket, socket.username, newRoom.room);
        //update old room
        updateChatRoom(socket, 'disconnected');
        //change room
        socket.room = newRoom.room;
        //update new room
        updateChatRoom(socket, 'connected');
        updateRoomList(socket, socket.room);
    });
    
    //disconnecting from a room
    socket.on('diconnect', function() {
        // remove the user from global list
        delete usernames[socket.username];
        // tell the user list on the client side
        client.emit('updateUsers', usernames);
        //tell everyone
        updateGlobal(socket, 'disonnected');
        //leave channel
        socket.leave(socket.room);
    });

    //Add new room to array of rooms
    socket.on('addnewRoom', function(data) {
        socket.room = data.currRoom;
        socket.username = data.username;

        var exist = false;
        var len = rooms.length;
        for(var i=0; i<len; i++) {
            if(rooms[i]==data.room){
                sendStatus('Room exists');
                exist = true;
                break;
            }
        }
        //If new room not exists add it
        if(exist===false) {
            rooms[len]=data.room;
            client.emit('addRoomToPage', rooms[len]);
        };
    });

});    


//update single client with this.
function updateClient(socket, username, newRoom) {
    socket.emit('updateChat', 'System', 'You\'ve connected to '+ newRoom);
}

function updateRoomList(socket, currentRoom ) {
    socket.emit('updateRooms', rooms, currentRoom);
}

//We will use this function to update the chatroom when a user joins or leaves
function updateChatRoom(socket, message) {
    socket.broadcast.to(socket.room).emit('updateChat', 'System', socket.username + ' has ' + message);
}

//We will use this function to update everyone
function updateGlobal(socket, message) {
    socket.broadcast.emit('updateChat', 'System', socket.username + ' has ' + message);
}
