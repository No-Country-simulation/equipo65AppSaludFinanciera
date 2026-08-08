"""
Catalogo de comercios y conceptos por categoria y por mercado.

Es la semilla del dataset de M1. NO son datos personales de nadie: son nombres
de comercios y conceptos de gasto, publicos y sin relacion con ninguna persona.

Cubre los tres mercados del proyecto porque M1 tiene que clasificar en los tres
idiomas (ADR-0009). Un modelo entrenado solo con comercios mexicanos devuelve
`otros` ante `IFOOD` o `PIX RECEBIDO`, y buena parte del jurado es de Brasil.

Las tres listas por categoria estan deliberadamente equilibradas: si `es` tuviera
80 comercios y `pt` cinco, el modelo aprenderia espanol y fingiria que sabe
portugues.
"""

from __future__ import annotations

# --------------------------------------------------------------------------
# Comercios reales por categoria y mercado. es = Mexico, pt = Brasil, en = EEUU
# --------------------------------------------------------------------------

COMERCIOS: dict[str, dict[str, list[str]]] = {
    "alimentacion": {
        "es": ["Walmart", "Soriana", "Chedraui", "Bodega Aurrera", "La Comer", "Costco",
               "Oxxo", "Seven Eleven", "Superama", "Comercial Mexicana", "HEB",
               "Burger King", "McDonalds", "Dominos Pizza", "Starbucks", "Subway",
               "KFC", "Vips", "Toks", "Sanborns", "Rappi", "Uber Eats", "Didi Food",
               "Panaderia La Espiga", "Tortilleria San Juan", "Cafe Punta del Cielo",
               "Restaurante El Farolito", "Marisqueria La Costa", "Taqueria El Paisa"],
        "pt": ["Carrefour", "Pao de Acucar", "Extra", "Assai Atacadista", "Atacadao",
               "Big Bompreco", "Sendas", "Mercadinho Sao Luiz", "Zona Sul",
               "iFood", "Rappi Brasil", "Habibs", "Bobs", "Giraffas", "Outback",
               "Padaria Bella Paulista", "Cafeteria Suplicy", "Restaurante Fogo de Chao",
               "Spoleto", "China in Box", "Casa do Pao de Queijo"],
        "en": ["Whole Foods Market", "Kroger", "Safeway", "Trader Joes", "Publix",
               "Aldi", "Wegmans", "Albertsons", "Sprouts Farmers Market",
               "Chipotle", "Panera Bread", "Dunkin Donuts", "Wendys", "Taco Bell",
               "DoorDash", "Grubhub", "Olive Garden", "Five Guys"],
    },
    "transporte": {
        "es": ["Uber", "DiDi", "Cabify", "Beat", "Sitio Taxi Reforma", "Metro CDMX",
               "Metrobus", "Tren Ligero", "Mexibus", "Autobuses ADO", "ETN Turistar",
               "Pemex", "Shell Mexico", "BP Gasolinera", "Mobil", "Gasolinera Total",
               "Estacionamiento Centro", "Peaje Autopista Mexico Queretaro",
               "Tag IAVE", "Aeromexico", "Volaris", "Viva Aerobus", "Taller Mecanico Lopez"],
        "pt": ["Uber Brasil", "99 Taxi", "Metro Sao Paulo", "SPTrans", "CPTM",
               "BRT Rio", "Onibus Viacao Cometa", "Posto Ipiranga", "Posto Shell",
               "Posto BR Petrobras", "Estacionamento Estapar", "Pedagio CCR",
               "Sem Parar", "ConectCar", "Gol Linhas Aereas", "Azul Linhas Aereas",
               "Latam Brasil", "Oficina Mecanica Silva"],
        "en": ["Lyft", "Uber US", "Amtrak", "Greyhound", "MTA Subway", "BART",
               "Shell Gas Station", "Chevron", "Exxon Mobil", "BP Fuel",
               "Parking Garage Downtown", "EZ Pass Toll", "Delta Air Lines",
               "Southwest Airlines", "United Airlines", "Jiffy Lube"],
    },
    "vivienda": {
        "es": ["Renta Departamento", "Pago Hipoteca Infonavit", "Credito Hipotecario BBVA",
               "Cuota Mantenimiento Condominio", "Administracion Fraccionamiento",
               "Home Depot Mexico", "Ikea Mexico", "Liverpool Muebles",
               "Ferreteria El Tornillo", "Plomeria Rapida", "Mudanza Express"],
        "pt": ["Aluguel Apartamento", "Financiamento Imobiliario Caixa",
               "Condominio Edificio Aurora", "Taxa de Condominio", "Leroy Merlin",
               "Telha Norte", "Casa e Video Moveis", "Marcenaria Souza",
               "Reforma Predial", "IPTU Prefeitura"],
        "en": ["Apartment Rent", "Mortgage Payment", "HOA Fees", "Home Depot",
               "Lowes Home Improvement", "IKEA", "Wayfair Furniture",
               "Property Tax", "Plumbing Service"],
    },
    "servicios": {
        "es": ["CFE Electricidad", "Naturgy Gas", "Agua y Saneamiento SACMEX", "Telmex",
               "Izzi Telecom", "Totalplay", "Megacable", "Telcel", "AT&T Mexico",
               "Movistar Mexico", "Sky Television", "Dish Mexico", "Gas Natural Fenosa"],
        "pt": ["Conta de Luz Enel", "CEMIG Energia", "Copel Distribuicao",
               "Sabesp Agua", "Comgas", "Vivo Fibra", "Claro Net", "TIM Celular",
               "Oi Telecomunicacoes", "Sky Brasil", "Conta de Gas"],
        "en": ["Electric Utility Bill", "Water Bill", "Natural Gas Company",
               "Comcast Xfinity", "AT&T Internet", "Verizon Wireless", "T-Mobile",
               "Spectrum Cable", "Internet Service Provider"],
    },
    "salud": {
        "es": ["Farmacias del Ahorro", "Farmacias Guadalajara", "Farmacias Similares",
               "Farmacias Benavides", "Hospital Angeles", "Clinica Medica Sur",
               "Laboratorio Chopo", "Consulta Dentista", "Optica Devlyn",
               "Seguro Medico GNP", "Salud Digna", "Doctor Consulta General"],
        "pt": ["Drogasil", "Droga Raia", "Drogaria Sao Paulo", "Pacheco Drogaria",
               "Hospital Albert Einstein", "Laboratorio Fleury", "Clinica Odontologica",
               "Unimed Plano de Saude", "Amil Saude", "Consulta Medica"],
        "en": ["CVS Pharmacy", "Walgreens", "Rite Aid", "General Hospital",
               "Dental Clinic", "LabCorp", "Quest Diagnostics", "Health Insurance Premium",
               "Urgent Care Visit"],
    },
    "educacion": {
        "es": ["Colegiatura Universidad UNAM", "Inscripcion Tec de Monterrey",
               "Colegio Particular Cuota", "Curso de Ingles Harmon Hall",
               "Libreria Gandhi", "Papeleria Lumen", "Platzi Suscripcion",
               "Coursera Cursos", "Udemy Curso", "Kumon Matematicas"],
        "pt": ["Mensalidade Faculdade USP", "Mensalidade Escola Objetivo",
               "Curso de Ingles Wizard", "Livraria Cultura", "Saraiva Livros",
               "Alura Cursos", "Descomplica", "Material Escolar"],
        "en": ["University Tuition", "College Bookstore", "Coursera Subscription",
               "Udemy Course", "Khan Academy Donation", "School Supplies",
               "Student Loan Payment"],
    },
    "entretenimiento": {
        "es": ["Netflix", "Spotify Premium", "Disney Plus", "HBO Max", "Amazon Prime Video",
               "Star Plus", "Paramount Plus", "Crunchyroll", "YouTube Premium",
               "Cinepolis", "Cinemex", "Teatro Insurgentes", "Gimnasio Smart Fit",
               "Sportsworld Gym", "Steam Juegos", "PlayStation Store", "Xbox Game Pass",
               "Nintendo eShop", "Bar La Cerveceria", "Ticketmaster Concierto"],
        "pt": ["Netflix Brasil", "Spotify Brasil", "Globoplay", "Deezer Premium",
               "Telecine", "Cinemark Brasil", "UCI Cinemas", "Academia Smart Fit",
               "Bio Ritmo Academia", "Bar do Zeca", "Ingresso.com Show",
               "PlayStation Brasil", "Steam Games"],
        "en": ["Netflix US", "Spotify USA", "Hulu", "Disney Plus US", "HBO Max US",
               "AMC Theatres", "Regal Cinemas", "Planet Fitness", "Equinox Gym",
               "Steam Store", "Xbox Live", "Ticketmaster Event", "Twitch Subscription"],
    },
    "compras": {
        "es": ["Amazon Mexico", "Mercado Libre", "Liverpool", "Palacio de Hierro",
               "Coppel", "Elektra", "Sears Mexico", "Zara Mexico", "H&M Mexico",
               "Bershka", "Nike Store", "Adidas Mexico", "Best Buy Mexico",
               "Office Depot", "Shein", "Temu", "AliExpress", "Andrea Zapatos"],
        "pt": ["Amazon Brasil", "Mercado Livre", "Magazine Luiza", "Americanas",
               "Casas Bahia", "Ponto Frio", "Renner", "C&A Brasil", "Riachuelo",
               "Centauro Esportes", "Netshoes", "Fast Shop", "Shopee Brasil"],
        "en": ["Amazon", "Target", "Walmart US", "Best Buy", "Macys", "Nordstrom",
               "Nike", "Adidas US", "Apple Store", "eBay", "Etsy", "Wayfair"],
    },
    "finanzas": {
        "es": ["Pago Tarjeta de Credito BBVA", "Pago Minimo Banamex", "Comision Bancaria",
               "Anualidad Tarjeta Santander", "Intereses Credito Nomina",
               "Prestamo Personal HSBC", "Seguro de Auto Qualitas", "Seguro de Vida MetLife",
               "Pago SAT Impuestos", "Predial Municipal", "Multa de Transito"],
        "pt": ["Pagamento Fatura Cartao Nubank", "Tarifa Bancaria Itau",
               "Anuidade Cartao Bradesco", "Juros Cheque Especial",
               "Emprestimo Pessoal Santander", "Seguro Auto Porto Seguro",
               "IOF Operacao", "Imposto de Renda Receita Federal", "IPVA Detran"],
        "en": ["Credit Card Payment", "Bank Service Fee", "Annual Card Fee",
               "Loan Interest Payment", "Personal Loan Payment", "Auto Insurance Geico",
               "Life Insurance Premium", "IRS Tax Payment", "Overdraft Fee"],
    },
    "ahorro_inversion": {
        "es": ["Transferencia a Cuenta de Ahorro", "Aportacion Afore", "Pagare Bancario",
               "Cetes Directo", "Inversion GBM Fondos", "Kuspit Inversiones",
               "Compra de Dolares", "Bitso Cripto", "Binance Compra", "Ahorro Programado"],
        "pt": ["Aplicacao em CDB", "Tesouro Direto", "Poupanca Deposito",
               "Investimento XP", "Rico Investimentos", "Nuinvest Aporte",
               "Compra de Bitcoin", "Fundo de Investimento", "Previdencia Privada"],
        "en": ["Transfer to Savings", "401k Contribution", "Roth IRA Deposit",
               "Vanguard Investment", "Fidelity Brokerage", "Robinhood Deposit",
               "Coinbase Purchase", "Certificate of Deposit", "Emergency Fund Transfer"],
    },
    "ingresos": {
        # ⚠️ Sin "Pago de ..." aqui. Con "Pago de Sueldo" y "Pago de Cliente" en
        # esta categoria, el modelo aprendia que "Pago de" significa ingreso y
        # mandaba "Pago de alquiler" a `ingresos` con 0.60 de confianza --
        # suficiente para superar el umbral y colarse. Se usan las formas que un
        # extracto usa de verdad para una entrada de dinero: deposito, abono,
        # transferencia recibida.
        "es": ["Nomina Quincenal", "Deposito de Nomina", "Abono de Sueldo",
               "Transferencia Recibida", "Honorarios Profesionales", "Reembolso de Gastos",
               "Aguinaldo", "Reparto de Utilidades", "Cobro a Cliente Freelance",
               "Devolucion de Impuestos SAT", "Renta Recibida de Inquilino"],
        "pt": ["Salario Mensal", "PIX Recebido Salario", "TED Recebida",
               "Deposito em Conta", "Pagamento de Cliente", "Reembolso de Despesas",
               "Decimo Terceiro", "Restituicao Imposto de Renda", "Aluguel Recebido"],
        "en": ["Payroll Deposit", "Direct Deposit Salary", "Freelance Payment Received",
               "Client Invoice Paid", "Expense Reimbursement", "Tax Refund",
               "Bonus Payment", "Rental Income", "Wire Transfer Received"],
    },
    "otros": {
        "es": ["Cargo No Identificado", "Retiro en Cajero", "Disposicion de Efectivo",
               "Donativo Cruz Roja", "Regalo Cumpleanos", "Barberia El Corte",
               "Salon de Belleza Glamour", "Lavanderia Express", "Veterinaria Patitas",
               "Notaria Publica Tramite"],
        "pt": ["Saque em Caixa Eletronico", "Lancamento Nao Identificado",
               "Doacao ONG", "Barbearia do Joao", "Salao de Beleza",
               "Lavanderia Rapida", "Pet Shop Clinica Veterinaria", "Cartorio Taxa"],
        "en": ["ATM Withdrawal", "Unidentified Charge", "Charity Donation",
               "Barber Shop", "Hair Salon", "Laundromat", "Veterinary Clinic",
               "Notary Fee", "Cash Advance"],
    },
}


# --------------------------------------------------------------------------
# Conceptos genericos por categoria
# --------------------------------------------------------------------------
#
# Muchos extractos no traen el comercio, traen el concepto: "COMBUSTIBLE",
# "RENTA", "COLEGIATURA". Y es **exactamente** lo que usa el ejemplo del
# enunciado, que es lo que el jurado va a copiar y pegar:
#
#     {"descripcion": "Supermercado", ...}
#     {"descripcion": "Combustible",  ...}
#     {"descripcion": "Streaming",    ...}
#
# Sin estos ejemplos el modelo solo aprende nombres de marca y falla justo en
# las tres descripciones que mas importan.

CONCEPTOS: dict[str, dict[str, list[str]]] = {
    "alimentacion": {
        "es": ["Supermercado", "Despensa", "Restaurante", "Comida", "Cafeteria", "Abarrotes"],
        "pt": ["Supermercado", "Mercado", "Restaurante", "Alimentacao", "Padaria", "Lanchonete"],
        "en": ["Supermarket", "Groceries", "Restaurant", "Food", "Coffee Shop", "Dining"],
    },
    "transporte": {
        "es": ["Combustible", "Gasolina", "Transporte", "Transporte Publico", "Taxi",
               "Estacionamiento", "Peaje", "Pasaje Autobus"],
        "pt": ["Combustivel", "Gasolina", "Transporte", "Transporte Publico",
               "Estacionamento", "Pedagio", "Passagem Onibus"],
        "en": ["Fuel", "Gasoline", "Transport", "Public Transit", "Parking", "Toll", "Bus Fare"],
    },
    "vivienda": {
        "es": ["Renta", "Pago de Renta", "Pago de Alquiler", "Alquiler", "Hipoteca",
               "Pago de Hipoteca", "Mantenimiento del Hogar", "Cuota de Mantenimiento"],
        "pt": ["Aluguel", "Pagamento de Aluguel", "Financiamento da Casa", "Condominio",
               "Manutencao do Lar", "Taxa de Condominio"],
        "en": ["Rent", "Rent Payment", "Mortgage", "Mortgage Payment", "Home Maintenance",
               "HOA Dues"],
    },
    "servicios": {
        "es": ["Luz", "Electricidad", "Agua", "Gas Domestico", "Internet", "Telefonia",
               "Recibo de Luz", "Servicios del Hogar"],
        "pt": ["Luz", "Energia Eletrica", "Agua", "Gas Encanado", "Internet", "Telefonia",
               "Conta de Luz", "Contas da Casa"],
        "en": ["Electricity", "Water", "Natural Gas", "Internet", "Phone Bill",
               "Utility Bill", "Utilities"],
    },
    "salud": {
        "es": ["Farmacia", "Medicamentos", "Consulta Medica", "Dentista", "Laboratorio",
               "Seguro Medico", "Salud"],
        "pt": ["Farmacia", "Medicamentos", "Consulta Medica", "Dentista", "Laboratorio",
               "Plano de Saude", "Saude"],
        "en": ["Pharmacy", "Medication", "Doctor Visit", "Dentist", "Lab Test",
               "Health Insurance", "Healthcare"],
    },
    "educacion": {
        "es": ["Colegiatura", "Educacion", "Curso", "Libros", "Material Escolar", "Matricula"],
        "pt": ["Mensalidade", "Educacao", "Curso", "Livros", "Material Escolar", "Matricula"],
        "en": ["Tuition", "Education", "Course", "Books", "School Supplies", "Enrollment"],
    },
    "entretenimiento": {
        "es": ["Streaming", "Suscripcion Streaming", "Entretenimiento", "Cine", "Gimnasio",
               "Videojuegos", "Salida con Amigos", "Ocio"],
        "pt": ["Streaming", "Assinatura Streaming", "Entretenimento", "Cinema", "Academia",
               "Videogames", "Lazer"],
        "en": ["Streaming", "Streaming Subscription", "Entertainment", "Movies", "Gym",
               "Video Games", "Leisure"],
    },
    "compras": {
        "es": ["Compras", "Ropa", "Calzado", "Electronica", "Regalo", "Compra en Linea"],
        "pt": ["Compras", "Roupas", "Calcados", "Eletronicos", "Presente", "Compra Online"],
        "en": ["Shopping", "Clothing", "Footwear", "Electronics", "Gift", "Online Purchase"],
    },
    "finanzas": {
        "es": ["Comision Bancaria", "Intereses", "Pago de Deuda", "Seguro", "Impuestos",
               "Anualidad de Tarjeta"],
        "pt": ["Tarifa Bancaria", "Juros", "Pagamento de Divida", "Seguro", "Impostos",
               "Anuidade do Cartao"],
        "en": ["Bank Fee", "Interest Charge", "Debt Payment", "Insurance", "Taxes",
               "Card Annual Fee"],
    },
    "ahorro_inversion": {
        "es": ["Ahorro", "Transferencia a Ahorro", "Inversion", "Aportacion a Fondo",
               "Cuenta de Ahorro"],
        "pt": ["Poupanca", "Transferencia para Poupanca", "Investimento",
               "Aporte em Fundo", "Aplicacao Financeira"],
        "en": ["Savings", "Transfer to Savings", "Investment", "Fund Contribution",
               "Brokerage Deposit"],
    },
    "ingresos": {
        "es": ["Nomina", "Sueldo", "Salario", "Deposito Recibido", "Ingreso", "Bonificacion"],
        "pt": ["Salario", "Folha de Pagamento", "Deposito Recebido", "Receita", "Bonificacao"],
        "en": ["Payroll", "Salary", "Deposit Received", "Income", "Bonus"],
    },
    "otros": {
        "es": ["Otros", "Retiro de Efectivo", "Cargo Varios", "Gasto Vario", "Sin Clasificar"],
        "pt": ["Outros", "Saque", "Lancamento Diverso", "Despesa Diversa", "Nao Classificado"],
        "en": ["Other", "Cash Withdrawal", "Miscellaneous", "Misc Expense", "Uncategorized"],
    },
}


# --------------------------------------------------------------------------
# Plantillas de extracto bancario
# --------------------------------------------------------------------------
#
# Un banco casi nunca escribe el nombre limpio. Estas son las formas reales en
# las que aparece, y son justo lo que hace que un modelo entrenado solo con
# nombres limpios falle en produccion: `char_wb` aprende a ignorar el ruido si
# lo ha visto durante el entrenamiento.

PLANTILLAS: dict[str, list[str]] = {
    "es": [
        "{c}", "{c}", "{c}",
        "COMPRA EN {c}", "PAGO {c}", "{c} *{ref}", "{c} #{num}", "{c} {ciudad}",
        "TARJ {c}", "{c} MEX", "COMPRA TDC {c}", "{c} SUC {num}",
        "PAGO SERVICIO {c}", "DOM {c}",
    ],
    "pt": [
        "{c}", "{c}", "{c}",
        "COMPRA {c}", "PAGAMENTO {c}", "{c} *{ref}", "{c} #{num}", "{c} {ciudad}",
        "CARTAO {c}", "{c} BR", "PIX {c}", "DEBITO AUTOMATICO {c}",
        "COMPRA CARTAO {c}", "TED {c}",
    ],
    "en": [
        "{c}", "{c}", "{c}",
        "PURCHASE {c}", "PAYMENT {c}", "{c} *{ref}", "{c} #{num}", "{c} {ciudad}",
        "CARD {c}", "{c} US", "POS {c}", "ACH {c}",
        "DEBIT {c}", "RECURRING {c}",
    ],
}

CIUDADES: dict[str, list[str]] = {
    "es": ["CDMX", "GUADALAJARA", "MONTERREY", "PUEBLA", "QUERETARO", "MERIDA", "TIJUANA"],
    "pt": ["SAO PAULO", "RIO DE JANEIRO", "BELO HORIZONTE", "CURITIBA", "PORTO ALEGRE",
           "SALVADOR", "RECIFE"],
    "en": ["NEW YORK", "LOS ANGELES", "CHICAGO", "HOUSTON", "SEATTLE", "MIAMI", "DENVER"],
}
