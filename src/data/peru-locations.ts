export interface UbigeoDepartment {
  nombre: string;
  provincias: {
    nombre: string;
    distritos: string[];
  }[];
}

export const PERU_UBIGEO: UbigeoDepartment[] = [
  {
    nombre: 'Lima',
    provincias: [
      {
        nombre: 'Lima',
        distritos: [
          'Cercado de Lima',
          'Ate',
          'Barranco',
          'Breña',
          'Carabayllo',
          'Chaclacayo',
          'Chorrillos',
          'Cieneguilla',
          'Comas',
          'El Agustino',
          'Independencia',
          'Jesús María',
          'La Molina',
          'La Victoria',
          'Lince',
          'Los Olivos',
          'Lurigancho (Chosica)',
          'Lurín',
          'Magdalena del Mar',
          'Miraflores',
          'Pachacámac',
          'Pucusana',
          'Pueblo Libre',
          'Puente Piedra',
          'Punta Hermosa',
          'Punta Negra',
          'Rímac',
          'San Bartolo',
          'San Borja',
          'San Isidro',
          'San Juan de Lurigancho',
          'San Juan de Miraflores',
          'San Luis',
          'San Martín de Porres',
          'San Miguel',
          'Santa Anita',
          'Santa María del Mar',
          'Santa Rosa',
          'Santiago de Surco',
          'Surquillo',
          'Villa El Salvador',
          'Villa María del Triunfo',
        ],
      },
      {
        nombre: 'Cañete',
        distritos: ['San Vicente de Cañete', 'Asia', 'Cerro Azul', 'Imperial', 'Mala', 'Nuevo Imperial', 'Quilmaná'],
      },
      {
        nombre: 'Huaral',
        distritos: ['Huaral', 'Chancay', 'Aucallama'],
      },
      {
        nombre: 'Huaura',
        distritos: ['Huacho', 'Hualmay', 'Sayán', 'Santa María', 'Vegueta'],
      },
      {
        nombre: 'Barranca',
        distritos: ['Barranca', 'Paramonga', 'Pativilca', 'Supe', 'Supe Puerto'],
      },
    ],
  },
  {
    nombre: 'Callao',
    provincias: [
      {
        nombre: 'Callao',
        distritos: ['Callao', 'Bellavista', 'Carmen de la Legua', 'La Perla', 'La Punta', 'Ventanilla', 'Mi Perú'],
      },
    ],
  },
  {
    nombre: 'Cusco',
    provincias: [
      {
        nombre: 'Cusco',
        distritos: ['Cusco', 'San Jerónimo', 'San Sebastián', 'Santiago', 'Wanchaq', 'Saylla', 'Poroy', 'Ccorca'],
      },
      {
        nombre: 'Urubamba',
        distritos: ['Urubamba', 'Ollantaytambo', 'Machupicchu', 'Maras', 'Chinchero', 'Yucay'],
      },
      {
        nombre: 'Calca',
        distritos: ['Calca', 'Pisac', 'Lamay', 'San Salvador'],
      },
      {
        nombre: 'Canchis',
        distritos: ['Sicuani', 'Combapata', 'Checacupe', 'Marangani', 'Tinta'],
      },
      {
        nombre: 'La Convención',
        distritos: ['Santa Ana (Quillabamba)', 'Echarate', 'Maranura', 'Pichari'],
      },
      {
        nombre: 'Anta',
        distritos: ['Anta', 'Cachimayo', 'Huarocondo', 'Limatambo', 'Zurite'],
      },
      {
        nombre: 'Espinar',
        distritos: ['Yauri', 'Condoroma', 'Coporaque', 'Pallpata'],
      },
    ],
  },
  {
    nombre: 'Arequipa',
    provincias: [
      {
        nombre: 'Arequipa',
        distritos: [
          'Arequipa',
          'Alto Selva Alegre',
          'Cayma',
          'Cerro Colorado',
          'Characato',
          'Jacobo Hunter',
          'José Luis Bustamante y Rivero',
          'Mariano Melgar',
          'Miraflores',
          'Paucarpata',
          'Sabandía',
          'Sachaca',
          'Socabaya',
          'Tiabaya',
          'Yanahuara',
          'Yura',
        ],
      },
      {
        nombre: 'Camaná',
        distritos: ['Camaná', 'José María Quimper', 'Mariscal Cáceres', 'Nicolás de Piérola', 'Samuel Pastor'],
      },
      {
        nombre: 'Islay',
        distritos: ['Mollendo', 'Cocachacra', 'Dean Valdivia', 'Islay', 'Mejía', 'Punta de Bombón'],
      },
      {
        nombre: 'Caylloma',
        distritos: ['Chivay', 'Cabanaconde', 'Majes', 'Yanque'],
      },
    ],
  },
  {
    nombre: 'La Libertad',
    provincias: [
      {
        nombre: 'Trujillo',
        distritos: [
          'Trujillo',
          'El Porvenir',
          'Florencia de Mora',
          'Huanchaco',
          'La Esperanza',
          'Laredo',
          'Moche',
          'Salaverry',
          'Víctor Larco Herrera',
        ],
      },
      {
        nombre: 'Chepén',
        distritos: ['Chepén', 'Pacanga', 'Pueblo Nuevo'],
      },
      {
        nombre: 'Pacasmayo',
        distritos: ['San Pedro de Lloc', 'Guadalupe', 'Pacasmayo'],
      },
      {
        nombre: 'Sánchez Carrión',
        distritos: ['Huamachuco', 'Chugay', 'Sanagorán'],
      },
    ],
  },
  {
    nombre: 'Piura',
    provincias: [
      {
        nombre: 'Piura',
        distritos: ['Piura', 'Castilla', 'Catacaos', 'Cura Mori', 'La Arena', 'La Unión', 'Las Lomas', 'Tambo Grande', 'Veintiséis de Octubre'],
      },
      {
        nombre: 'Sullana',
        distritos: ['Sullana', 'Bellavista', 'Ignacio Escudero', 'Marcavelica', 'Querecotillo'],
      },
      {
        nombre: 'Talara',
        distritos: ['Pariñas (Talara)', 'El Alto', 'La Brea', 'Lobitos', 'Los Órganos', 'Máncora'],
      },
      {
        nombre: 'Paita',
        distritos: ['Paita', 'Colán', 'Vichayal'],
      },
    ],
  },
  {
    nombre: 'Lambayeque',
    provincias: [
      {
        nombre: 'Chiclayo',
        distritos: ['Chiclayo', 'José Leonardo Ortiz', 'La Victoria', 'Monsefú', 'Pimentel', 'Reque', 'Santa Rosa'],
      },
      {
        nombre: 'Lambayeque',
        distritos: ['Lambayeque', 'Mórrope', 'Motupe', 'Olmos', 'Íllimo'],
      },
      {
        nombre: 'Ferreñafe',
        distritos: ['Ferreñafe', 'Incahuasi', 'Pitipo', 'Pueblo Nuevo'],
      },
    ],
  },
  {
    nombre: 'Junín',
    provincias: [
      {
        nombre: 'Huancayo',
        distritos: ['Huancayo', 'Chilca', 'El Tambo', 'Huancán', 'Pilcomayo', 'San Agustín', 'San Jerónimo de Tunán'],
      },
      {
        nombre: 'Tarma',
        distritos: ['Tarma', 'Acobamba', 'Palca', 'Tapo'],
      },
      {
        nombre: 'Jauja',
        distritos: ['Jauja', 'Acolla', 'Matahuasi', 'Yauyos'],
      },
      {
        nombre: 'Chanchamayo',
        distritos: ['Chanchamayo (La Merced)', 'Perené', 'Pichanaqui', 'San Ramón'],
      },
      {
        nombre: 'Satipo',
        distritos: ['Satipo', 'Mazamari', 'Pangoa', 'Río Negro'],
      },
    ],
  },
  {
    nombre: 'Áncash',
    provincias: [
      {
        nombre: 'Huaraz',
        distritos: ['Huaraz', 'Independencia', 'Tarica', 'Jangas'],
      },
      {
        nombre: 'Santa',
        distritos: ['Chimbote', 'Nuevo Chimbote', 'Coishco', 'Santa', 'Nepeña'],
      },
      {
        nombre: 'Casma',
        distritos: ['Casma', 'Buena Vista Alta', 'Comandante Noel'],
      },
    ],
  },
  {
    nombre: 'Ica',
    provincias: [
      {
        nombre: 'Ica',
        distritos: ['Ica', 'La Tinguiña', 'Los Aquijes', 'Parcona', 'Subtanjalla'],
      },
      {
        nombre: 'Chincha',
        distritos: ['Chincha Alta', 'Chincha Baja', 'Grocio Prado', 'Pueblo Nuevo', 'Sunampe'],
      },
      {
        nombre: 'Pisco',
        distritos: ['Pisco', 'Paracas', 'San Andrés', 'San Clemente', 'Túpac Amaru Inca'],
      },
      {
        nombre: 'Nasca',
        distritos: ['Nasca', 'Marcona', 'Vista Alegre'],
      },
    ],
  },
  {
    nombre: 'San Martín',
    provincias: [
      {
        nombre: 'San Martín',
        distritos: ['Tarapoto', 'Banda de Shilcayo', 'Morales', 'Cacatachi'],
      },
      {
        nombre: 'Moyobamba',
        distritos: ['Moyobamba', 'Calzada', 'Habana', 'Jepelacio', 'Soritor'],
      },
      {
        nombre: 'Rioja',
        distritos: ['Rioja', 'Nueva Cajamarca', 'Pardo Miguel'],
      },
    ],
  },
  {
    nombre: 'Loreto',
    provincias: [
      {
        nombre: 'Maynas',
        distritos: ['Iquitos', 'Belén', 'Punchana', 'San Juan Bautista'],
      },
      {
        nombre: 'Alto Amazonas',
        distritos: ['Yurimaguas', 'Balsapuerto', 'Jeberos'],
      },
    ],
  },
  {
    nombre: 'Puno',
    provincias: [
      {
        nombre: 'Puno',
        distritos: ['Puno', 'Acora', 'Capachica', 'Chucuito', 'Platería'],
      },
      {
        nombre: 'San Román',
        distritos: ['Juliaca', 'Cabana', 'Caracoto'],
      },
    ],
  },
  {
    nombre: 'Cajamarca',
    provincias: [
      {
        nombre: 'Cajamarca',
        distritos: ['Cajamarca', 'Baños del Inca', 'Jesús', 'Llacanora'],
      },
      {
        nombre: 'Jaén',
        distritos: ['Jaén', 'Bellavista', 'Pucará'],
      },
    ],
  },
  {
    nombre: 'Tacna',
    provincias: [
      {
        nombre: 'Tacna',
        distritos: ['Tacna', 'Alto de la Alianza', 'Ciudad Nueva', 'Coronel Gregorio Albarracín Lanchipa', 'Pocollay'],
      },
    ],
  },
  {
    nombre: 'Ayacucho',
    provincias: [
      {
        nombre: 'Huamanga',
        distritos: ['Ayacucho', 'Carmen Alto', 'Jesús Nazareno', 'San Juan Bautista'],
      },
    ],
  },
  {
    nombre: 'Huánuco',
    provincias: [
      {
        nombre: 'Huánuco',
        distritos: ['Huánuco', 'Amarilis', 'Pillco Marca'],
      },
      {
        nombre: 'Leoncio Prado',
        distritos: ['Rupa-Rupa (Tingo María)', 'José Crespo y Castillo', 'Luyando'],
      },
    ],
  },
  {
    nombre: 'Ucayali',
    provincias: [
      {
        nombre: 'Coronel Portillo',
        distritos: ['Callería (Pucallpa)', 'Manantay', 'Yarinacocha'],
      },
    ],
  },
  {
    nombre: 'Moquegua',
    provincias: [
      {
        nombre: 'Mariscal Nieto',
        distritos: ['Moquegua', 'Samegua', 'Torata'],
      },
      {
        nombre: 'Ilo',
        distritos: ['Ilo', 'El Algarrobal', 'Pacocha'],
      },
    ],
  },
  {
    nombre: 'Tumbes',
    provincias: [
      {
        nombre: 'Tumbes',
        distritos: ['Tumbes', 'Corrales', 'La Cruz', 'Pampas de Hospital', 'San Jacinto', 'San Juan de la Virgen'],
      },
      {
        nombre: 'Zarumilla',
        distritos: ['Zarumilla', 'Aguas Verdes'],
      },
    ],
  },
  {
    nombre: 'Amazonas',
    provincias: [
      {
        nombre: 'Chachapoyas',
        distritos: ['Chachapoyas', 'Leymebamba', 'Levanto'],
      },
      {
        nombre: 'Bagua',
        distritos: ['Bagua', 'Aramango', 'Imaza'],
      },
    ],
  },
  {
    nombre: 'Apurímac',
    provincias: [
      {
        nombre: 'Abancay',
        distritos: ['Abancay', 'Curahuasi', 'Tamburco'],
      },
      {
        nombre: 'Andahuaylas',
        distritos: ['Andahuaylas', 'San Jerónimo', 'Talavera'],
      },
    ],
  },
  {
    nombre: 'Huancavelica',
    provincias: [
      {
        nombre: 'Huancavelica',
        distritos: ['Huancavelica', 'Ascensión', 'Acoria'],
      },
    ],
  },
  {
    nombre: 'Madre de Dios',
    provincias: [
      {
        nombre: 'Tambopata',
        distritos: ['Tambopata (Puerto Maldonado)', 'Inambari', 'Laberinto', 'Las Piedras'],
      },
    ],
  },
  {
    nombre: 'Pasco',
    provincias: [
      {
        nombre: 'Pasco',
        distritos: ['Chaupimarca (Cerro de Pasco)', 'Yanacancha', 'Simón Bolívar'],
      },
      {
        nombre: 'Oxapampa',
        distritos: ['Oxapampa', 'Pozuzo', 'Villa Rica'],
      },
    ],
  },
];
