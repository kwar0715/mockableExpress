function sendData() {
    $.ajax({
        type: 'POST',
        url: '/admin/sockets/send',
        data: {
            value:$('textarea#txtmessage').val()
        }
    }).done(function(data) {
        $('textarea#txtConsole').val($('textarea#txtConsole').val() + '\n' + $('textarea#txtmessage').val())
    });
}