<?php

use App\Http\Controllers\BookingController;
use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\InspoController;
use App\Http\Controllers\ProfileController;
use App\Models\User;
use Inertia\Inertia;


// Home page: passes the single artist's public details to the welcome page.
Route::get('/', function () {
    $artist = User::where('role', 'artist')->orderBy('id')->first();

    return Inertia::render('welcome', [
        'artist' => $artist
            ? $artist->only('name', 'specialty', 'years_experience', 'bio', 'street_address', 'barangay', 'city', 'province', 'postal_code')
            : null,
    ]);
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/book', [BookingController::class, 'create'])->name('bookings.create');
    Route::post('/book', [BookingController::class, 'store'])->name('bookings.store');
    Route::patch('/book/{booking}/cancel', [BookingController::class, 'cancel'])->name('bookings.cancel');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('account.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('account.update');

    Route::patch('/book/{booking}/reschedule', [BookingController::class, 'reschedule'])->name('bookings.reschedule');

    Route::patch('/book/{booking}/accept', [BookingController::class, 'accept'])->name('bookings.accept');
    Route::patch('/book/{booking}/decline', [BookingController::class, 'decline'])->name('bookings.decline');
    Route::patch('/book/{booking}/complete', [BookingController::class, 'complete'])->name('bookings.complete');

    
    Route::get('/inspo', [InspoController::class, 'index'])->name('inspo.index');
    Route::post('/inspo', [InspoController::class, 'store'])->name('inspo.store');
    Route::delete('/inspo/{image}', [InspoController::class, 'destroy'])->name('inspo.destroy');
    Route::get('/artist/clients/{client}/inspo', [InspoController::class, 'showForClient'])->name('inspo.client-view');

    Route::inertia('/about', 'about')->name('about');
    Route::inertia('/admission', 'admission')->name('admission');
    Route::inertia('/academe', 'academe')->name('academe');
    Route::inertia('/studentsalumni', 'studentsalumni')->name('studentsalumni');
    Route::inertia('/researchextension', 'researchextension')->name('researchextension');
});

require __DIR__.'/settings.php';
