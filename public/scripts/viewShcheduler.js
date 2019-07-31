function handleOnRunScheduler(id,status) {
    $.ajax({
        type: 'POST',
        url: '/admin/schedulers/changeStatus',
        data: {
            id,
            status
        }
    }).done(function() {
        location.reload();
    });;
}

function deletePath(id) {
    var result = confirm("Do You Want to delete?");
              if(result){
                window.location.href=`/admin/schedulers/${id}/delete`;
              }
  }