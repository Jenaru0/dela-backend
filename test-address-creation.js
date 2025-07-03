// Script de prueba para crear direcciones y reproducir el error 500
const axios = require('axios');

async function testAddressCreation() {
  const backendUrl = 'https://delabackend.episundc.pe';

  // Primero necesitamos autenticarnos
  try {
    console.log('Iniciando test de creación de dirección...');

    // Datos de prueba para login (usar un usuario existente)
    const loginData = {
      email: 'test@example.com', // Cambiar por un email real
      contrasena: 'password123', // Cambiar por una contraseña real
    };

    console.log('Intentando login...');
    const loginResponse = await axios.post(
      `${backendUrl}/autenticacion/inicio-sesion`,
      loginData
    );
    const token = loginResponse.data.access_token;
    console.log('Login exitoso, token obtenido');

    // Datos para crear dirección (simulando lo que envía el frontend)
    const addressData = {
      alias: 'Casa',
      direccion: 'Av. Lima 123',
      departamento: 'Lima',
      provincia: 'Lima',
      distrito: 'Lima',
      codigoPostal: '15001',
      referencia: 'Cerca al parque',
      predeterminada: false,
      latitud: -12.0464,
      longitud: -77.0428,
      validadaGps: true,
      mapTilerPlaceId: 'test123',
    };

    console.log('Datos a enviar:', JSON.stringify(addressData, null, 2));

    const response = await axios.post(
      `${backendUrl}/direcciones`,
      addressData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Dirección creada exitosamente:', response.data);
  } catch (error) {
    console.error('❌ Error al crear dirección:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testAddressCreation();
