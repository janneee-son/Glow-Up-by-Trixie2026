<?php

return [
    'max_advance_months' => 24,

    /*
    |--------------------------------------------------------------------------
    | Initial service-area defaults
    |--------------------------------------------------------------------------
    |
    | These lists seed the editable service_areas table for an artist who has
    | no saved area records yet. Runtime booking choices and validation use
    | the artist-managed table, so future changes do not require code edits.
    |
    */
    'service_areas' => [
        'metro_manila' => [
            'Caloocan', 'Las Piñas', 'Makati', 'Malabon', 'Mandaluyong', 'Manila',
            'Marikina', 'Muntinlupa', 'Navotas', 'Parañaque', 'Pasay', 'Pasig',
            'Quezon City', 'San Juan', 'Taguig', 'Valenzuela', 'Pateros',
        ],
        'nearby_province' => ['Cavite', 'Tagaytay', 'Bulacan'],
    ],
];
