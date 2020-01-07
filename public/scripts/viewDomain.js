function deleteDomain(index) {
    var result = confirm("Do You Want to delete?");
    if (result) {
        window.location.href = `/admin/domain/delete/${index}`;
    }
}

function onSchedulerClick(){
    window.location.href = `/admin/schdulers`;
}

function configureMysql(){
    const data = {
        host: document.getElementById("host").value || "localhost:3306",
        username: document.getElementById("username").value || "root",
        password: document.getElementById("password").value || "password"
    }

    $.ajax({
        type: 'POST',
        url: '/admin/saveMysqlConfig',
        data
    });
}

function handleOnNodeAdmin(){
    $.ajax({
        type: 'GET',
        url: '/admin/other/nodeAdmin',
        success: function(data) {
            window.localStorage.setItem('nodeadmin', data.token);
            var win = window.open(data.reload, '_blank');
            win.focus();
        },
        error: function(data) {
            var win = window.open(data.reload, '_blank');
            win.focus();
        }
    });
}

function onEnvironmentClick(){
    window.location.href = `/admin/variables`;
}

function generateUUID() {
    var d = new Date().getTime();
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        d += performance.now();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

function createAuthKey() {
    var id = generateUUID();
    document.getElementById("authkey").innerHTML = ` Authorization: Bearer ${id} `;
    $.ajax({
        type: 'POST',
        url: '/admin/saveToken',
        data: {
            id: id
        }
    });
}

$(function() {
    $('#chk-enable-upload').bootstrapToggle({
        on: 'Enabled',
        off: 'Disabled'
    });
})

$(function() {
    $('#chk-enable-upload').change(function() {
        $.ajax({
            type: 'POST',
            url: '/admin/saveEnableUpload',
            data: {
                status: $(this).prop('checked')
            }
        });
    })
})

function getEnableUpload() {
    $.ajax({
        type: 'GET',
        url: '/admin/getEnableUpload'
    }).done(function(data) {
        if (data.enable == 'true')
            $('#chk-enable-upload').bootstrapToggle('on')
        else
            $('#chk-enable-upload').bootstrapToggle('off')
    });
}

function flushAllUserCommands() {
    var result = confirm("You Will Be Lost Every UserData")
    if (result) {
        $.ajax({
            type: 'POST',
            url: '/admin/flushAll'
        }).done(function(data) {
            if (data.success == true)
                alert("All User Data Fushed")
            else
                alert("Error")
        });
    }
}