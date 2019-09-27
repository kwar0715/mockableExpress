function deleteVariable(name) {
    var result = confirm("Do You Want to delete?");
    if(result){
        window.location.href=`/admin/variables/${name}/delete`;
    }
}