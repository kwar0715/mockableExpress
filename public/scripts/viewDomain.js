function deleteDomain(index) {
  var result = confirm("Do You Want to delete?");
  if (result) {
    window.location.href = `/domain/delete/${index}`;
  }
}
