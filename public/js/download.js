$(document).ready(function() {
    var myInt = setInterval(function(){
        $.ajax({
            method: 'GET',
            url: '/profile/ready'
        }).done(function(data) {
            if(data === 'Naw dawg'){
                // Not yet ready
                console.log(data);
            } else if (data === 'Download complete') {
                window.location = '/profile/welcome';
            }
        });
    }, 1000);
});