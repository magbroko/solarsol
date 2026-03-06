/**
 * Google Places Autocomplete for Nigerian cities
 * 1. Get API key from Google Cloud Console (enable Places API)
 * 2. Copy this file to places-init.js (in this folder)
 * 3. Add before app.js: <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_KEY&libraries=places"></script>
 * 4. Add: <script src="assets/js/places-init.js"></script>
 */
(function() {
    if (typeof google === 'undefined' || !google.maps || !google.maps.places) return;
    var input = document.getElementById('roiLocation');
    if (!input) return;
    var autocomplete = new google.maps.places.Autocomplete(input, {
        types: ['(cities)'],
        componentRestrictions: { country: 'ng' },
        fields: ['formatted_address', 'geometry']
    });
    autocomplete.addListener('place_changed', function() {
        var place = autocomplete.getPlace();
        if (place.formatted_address) input.value = place.formatted_address;
    });
})();
