//Submit the form
function submit(formID) {
   $('#' + formID).submit();
}

//Follow the url
function navigate(url) {
   window.location = url;
}

//Convert number to string with commas - http://stackoverflow.com/a/2901298
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}