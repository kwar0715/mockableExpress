function deletePath(domainId,pathId) {
    var result = confirm("Do You Want to delete?");
              if(result){
                window.location.href=`/domain/paths/${domainId}/${pathId}/delete`;
              }
  }