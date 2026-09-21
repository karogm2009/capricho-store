import { supabase } from './supabase.js';

const form = document.querySelector('#login-form');
const message = document.querySelector('#login-message');

if (form) {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        window.location.href = 'index.html';
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        message.textContent = 'Iniciando sesión...';

        const email = document.querySelector('#email').value.trim();
        const password = document.querySelector('#password').value;

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            message.textContent = error.message;
            return;
        }

        // Verificar que el usuario realmente sea administrador
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();

        if (profileError || profile?.role !== 'admin') {
            await supabase.auth.signOut();
            message.textContent = 'Este usuario no tiene permisos de administrador.';
            return;
        }

        message.textContent = 'Acceso correcto...';

        window.location.href = 'index.html';
    });
}