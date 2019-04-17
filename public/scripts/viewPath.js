function deletePath(domainId,pathID) {
    var result = confirm("Do You Want to delete?");
              if(result){
                window.location.href=`/domain/paths/${domainId}/${pathID}/delete`;
              }
  }