/* Booking form: validates, then saves the request to Supabase */
const failureMessage = 'Something went wrong. Please try again or email ehabmontasser@gmail.com.';

export function initBookingForm() {
  const form = document.querySelector('[data-book-form]');
  const status = document.querySelector('[data-form-status]');
  if (!form || !status) return;

  const submitButton = form.querySelector('button[type="submit"]');

  const messages = {
    firstName: 'Enter your first name.',
    lastName: 'Enter your last name.',
    email: 'Enter an email address like name@company.com.',
    phone: 'Enter a phone number using digits, spaces or a leading +.',
  };

  const validateField = (input) => {
    const error = document.getElementById(`${input.id}-error`);
    const value = input.value.trim();
    let valid = value.length > 0 && input.checkValidity();
    if (input.type === 'tel') valid = valid && value.replace(/\D/g, '').length >= 7;

    input.setAttribute('aria-invalid', String(!valid));
    if (error) {
      error.textContent = valid ? '' : messages[input.name];
      if (valid) input.removeAttribute('aria-describedby');
      else input.setAttribute('aria-describedby', error.id);
    }
    return valid;
  };

  const inputs = [...form.querySelectorAll('input')];

  // Validate after the visitor has interacted with a field, not while they type
  inputs.forEach((input) => {
    input.addEventListener('blur', () => {
      if (input.value.trim() !== '') validateField(input);
    });
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') validateField(input);
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitButton.disabled) return;
    status.hidden = true;

    const results = inputs.map(validateField);
    const firstInvalid = inputs[results.indexOf(false)];
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    const value = (name) => form.elements[name].value.trim();
    const firstName = value('firstName');

    submitButton.disabled = true;
    try {
      // Loaded on demand so the rest of the page never depends on the CDN
      const { createBooking } = await import('../lib/bookings.js');
      await createBooking({
        firstName,
        lastName: value('lastName'),
        email: value('email'),
        phone: value('phone'),
      });
    } catch (error) {
      console.error('Booking failed', error);
      status.textContent = failureMessage;
      status.hidden = false;
      return;
    } finally {
      submitButton.disabled = false;
    }

    status.textContent = `Thank you, ${firstName}. Your request has been received successfully.`;
    status.hidden = false;
    form.reset();
    inputs.forEach((input) => input.removeAttribute('aria-invalid'));
  });
}
