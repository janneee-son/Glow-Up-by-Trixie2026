<?php

use App\Http\Controllers\BookingController;
use App\Http\Controllers\ArtistOfferingController;
use App\Http\Controllers\ArtistAnalyticsController;
use App\Http\Controllers\ArtistNotificationController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InspoController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ServiceController;
use App\Models\ArtistService;
use App\Models\ArtistOffering;
use App\Models\User;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\ArtistGalleryController;
use App\Models\ArtistGalleryImage;
use Illuminate\Support\Facades\Storage;

// Home page: shows the artist's public details and active services.
Route::get('/', function () {
    $artist = User::artist();

    $services = $artist
        ? ArtistService::where('user_id', $artist->id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'price', 'description'])
        : collect();

    $offerings = $artist
        ? ArtistOffering::where('user_id', $artist->id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'kind', 'name', 'price', 'pricing_type', 'description', 'inclusions'])
        : collect();

    $galleryImages = $artist
        ? ArtistGalleryImage::where('user_id', $artist->id)
            ->latest()
            ->get(['id', 'path', 'caption'])
            ->map(fn (ArtistGalleryImage $image) => [
                'id' => $image->id,
                'caption' => $image->caption,
                'image_url' => Storage::url($image->path),
            ])
        : collect();

    return Inertia::render('welcome', [
        'artist' => $artist
            ? $artist->only(
                'name',
                'specialty',
                'years_experience',
                'bio',
                'street_address',
                'barangay',
                'city',
                'province',
                'postal_code',
            )
            : null,
        'services' => $services,
        'packages' => $offerings->where('kind', 'package')->values(),
        'galleryImages' => $galleryImages,
    ]);
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/artist/analytics', [ArtistAnalyticsController::class, 'index'])->name('artist.analytics');
    Route::get('/artist/notifications', [ArtistNotificationController::class, 'index'])->name('artist.notifications.index');
    Route::patch('/artist/notifications/{notification}/read', [ArtistNotificationController::class, 'markRead'])->name('artist.notifications.read');
    Route::patch('/artist/notifications/read-all', [ArtistNotificationController::class, 'markAllRead'])->name('artist.notifications.read-all');

    Route::get('/book', [BookingController::class, 'create'])->name('bookings.create');
    Route::post('/book', [BookingController::class, 'store'])->name('bookings.store');
    Route::patch('/book/{booking}/cancel', [BookingController::class, 'cancel'])->name('bookings.cancel');
    Route::patch('/book/{booking}/reschedule', [BookingController::class, 'reschedule'])->name('bookings.reschedule');
    Route::patch('/book/{booking}/accept', [BookingController::class, 'accept'])->name('bookings.accept');
    Route::patch('/book/{booking}/decline', [BookingController::class, 'decline'])->name('bookings.decline');
    Route::patch('/book/{booking}/complete', [BookingController::class, 'complete'])->name('bookings.complete');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('account.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('account.update');

    Route::get('/inspo', [InspoController::class, 'index'])->name('inspo.index');
    Route::post('/inspo', [InspoController::class, 'store'])->name('inspo.store');
    Route::delete('/inspo/{image}', [InspoController::class, 'destroy'])->name('inspo.destroy');
    Route::get('/artist/clients/{client}/inspo', [InspoController::class, 'showForClient'])->name('inspo.client-view');

    Route::get('/artist/services', [ServiceController::class, 'index'])->name('services.index');
    Route::post('/artist/services', [ServiceController::class, 'store'])->name('services.store');
    Route::patch('/artist/services/{service}', [ServiceController::class, 'update'])->name('services.update');
    Route::patch('/artist/services/{service}/toggle', [ServiceController::class, 'toggle'])->name('services.toggle');
    Route::delete('/artist/services/{service}', [ServiceController::class, 'destroy'])->name('services.destroy');

    Route::post('/artist/offerings', [ArtistOfferingController::class, 'store'])->name('offerings.store');
    Route::patch('/artist/offerings/{offering}', [ArtistOfferingController::class, 'update'])->name('offerings.update');
    Route::patch('/artist/offerings/{offering}/toggle', [ArtistOfferingController::class, 'toggle'])->name('offerings.toggle');
    Route::delete('/artist/offerings/{offering}', [ArtistOfferingController::class, 'destroy'])->name('offerings.destroy');

    Route::get('/admin/gallery', [ArtistGalleryController::class, 'index'])
    ->name('admin.gallery.index');
    Route::post('/admin/gallery', [ArtistGalleryController::class, 'store'])
    ->name('admin.gallery.store');
   Route::delete('/admin/gallery/{image}', [ArtistGalleryController::class, 'destroy'])
    ->name('admin.gallery.destroy');

    Route::inertia('/about', 'about')->name('about');
    Route::inertia('/admission', 'admission')->name('admission');
    Route::inertia('/academe', 'academe')->name('academe');
    Route::inertia('/studentsalumni', 'studentsalumni')->name('studentsalumni');
    Route::inertia('/researchextension', 'researchextension')->name('researchextension');
});

require __DIR__.'/settings.php';
