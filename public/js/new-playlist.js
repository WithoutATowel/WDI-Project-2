$(document).ready(function() {
    // Initialize Materialize select multiple input
    $('select').material_select();

    // Form validation checks for selection of 2+ users
    $('#new-playlist-form').on('submit', function(e) {
        if ($('#members').val().length < 2) {
            e.preventDefault();
            // Show a custom error message to the user explaining how to proceed.
            $('#multi-select-error').text('Choose two or more members to create a playlist.');
        } else {
            // Form input is valid. Disable the "create" button to prevent accidental double-clicking.
            $('input[type="submit"]').attr('disabled', 'disabled');
        }
    });

    // Clear error message for multi-select if the user makes a selection
    $('#members').on('change', function() {
        $('#multi-select-error').text('');
    });

    // Define a custom error message for the playlist name field to be shown when validation fails.
    $('#playlist-name').on('invalid', function() { 
        $(this)[0].setCustomValidity('Please provide a playlist name.'); 
        $(this).focus(); 
    });

    // Clear error message for "name" if the user changes value
    $('#playlist-name').on('change', function() { $(this)[0].setCustomValidity(''); });
});