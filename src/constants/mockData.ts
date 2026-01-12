import { User, Filial, Product, StockItem } from '@/types';

export const MOCK_FILIAIS: Filial[] = [
  {
    id: 'fil-001',
    name: 'Filial Centro',
    cnpj: '12.345.678/0001-01',
    address: 'Rua Principal, 100 - Centro',
  },
  {
    id: 'fil-002',
    name: 'Filial Jardins',
    cnpj: '12.345.678/0002-02',
    address: 'Av. das Flores, 250 - Jardins',
  },
  {
    id: 'fil-003',
    name: 'Filial Shopping',
    cnpj: '12.345.678/0003-03',
    address: 'Shopping Center, Loja 45 - Zona Sul',
  },
];

export const MOCK_USERS: User[] = [
  // Filial Centro
  {
    id: 'user-001',
    name: 'Ana Silva',
    email: 'ana.centro@farma.com',
    role: 'admin',
    filialId: 'fil-001',
  },
  {
    id: 'user-002',
    name: 'Carlos Santos',
    email: 'carlos.centro@farma.com',
    role: 'viewer',
    filialId: 'fil-001',
  },
  // Filial Jardins
  {
    id: 'user-003',
    name: 'Maria Oliveira',
    email: 'maria.jardins@farma.com',
    role: 'admin',
    filialId: 'fil-002',
  },
  {
    id: 'user-004',
    name: 'João Pereira',
    email: 'joao.jardins@farma.com',
    role: 'viewer',
    filialId: 'fil-002',
  },
  // Filial Shopping
  {
    id: 'user-005',
    name: 'Paula Costa',
    email: 'paula.shopping@farma.com',
    role: 'admin',
    filialId: 'fil-003',
  },
  {
    id: 'user-006',
    name: 'Roberto Lima',
    email: 'roberto.shopping@farma.com',
    role: 'viewer',
    filialId: 'fil-003',
  },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    name: 'Paracetamol 500mg',
    activeIngredient: 'Paracetamol',
    manufacturer: 'EMS Pharma',
    ean: '7891234567890',
    ncm: '30049099',
  },
  {
    id: 'prod-002',
    name: 'Dipirona Sódica 500mg',
    activeIngredient: 'Dipirona Sódica',
    manufacturer: 'Medley',
    ean: '7891234567891',
    ncm: '30049099',
  },
  {
    id: 'prod-003',
    name: 'Amoxicilina 500mg',
    activeIngredient: 'Amoxicilina',
    manufacturer: 'Neo Química',
    ean: '7891234567892',
    ncm: '30042019',
  },
  {
    id: 'prod-004',
    name: 'Losartana Potássica 50mg',
    activeIngredient: 'Losartana Potássica',
    manufacturer: 'EMS Pharma',
    ean: '7891234567893',
    ncm: '30049099',
  },
  {
    id: 'prod-005',
    name: 'Omeprazol 20mg',
    activeIngredient: 'Omeprazol',
    manufacturer: 'Eurofarma',
    ean: '7891234567894',
    ncm: '30049099',
  },
];

// Função auxiliar para adicionar meses a uma data
const addMonths = (date: Date, months: number): string => {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + months);
  return newDate.toISOString().split('T')[0];
};

const today = new Date();

export const MOCK_STOCK_ITEMS: StockItem[] = [
  // Filial Centro - alguns produtos próximos do vencimento
  {
    id: 'stock-001',
    productId: 'prod-001',
    filialId: 'fil-001',
    lote: 'L001A2024',
    expirationDate: addMonths(today, 4), // Vence em 4 meses
    quantity: 150,
    unitPrice: 12.50,
    entryDate: '2024-06-15',
    nfeNumber: '000123',
  },
  {
    id: 'stock-002',
    productId: 'prod-002',
    filialId: 'fil-001',
    lote: 'L002B2024',
    expirationDate: addMonths(today, 8),
    quantity: 200,
    unitPrice: 8.90,
    entryDate: '2024-07-20',
    nfeNumber: '000124',
  },
  {
    id: 'stock-003',
    productId: 'prod-003',
    filialId: 'fil-001',
    lote: 'L003C2024',
    expirationDate: addMonths(today, 3), // Vence em 3 meses
    quantity: 80,
    unitPrice: 25.00,
    entryDate: '2024-08-10',
    nfeNumber: '000125',
  },
  // Filial Jardins
  {
    id: 'stock-004',
    productId: 'prod-001',
    filialId: 'fil-002',
    lote: 'L001D2024',
    expirationDate: addMonths(today, 10),
    quantity: 100,
    unitPrice: 12.50,
    entryDate: '2024-09-05',
    nfeNumber: '000201',
  },
  {
    id: 'stock-005',
    productId: 'prod-004',
    filialId: 'fil-002',
    lote: 'L004E2024',
    expirationDate: addMonths(today, 5), // Vence em 5 meses
    quantity: 120,
    unitPrice: 18.50,
    entryDate: '2024-09-15',
    nfeNumber: '000202',
  },
  {
    id: 'stock-006',
    productId: 'prod-005',
    filialId: 'fil-002',
    lote: 'L005F2024',
    expirationDate: addMonths(today, 12),
    quantity: 90,
    unitPrice: 22.00,
    entryDate: '2024-10-01',
    nfeNumber: '000203',
  },
  // Filial Shopping
  {
    id: 'stock-007',
    productId: 'prod-002',
    filialId: 'fil-003',
    lote: 'L002G2024',
    expirationDate: addMonths(today, 2), // Vence em 2 meses
    quantity: 60,
    unitPrice: 8.90,
    entryDate: '2024-10-10',
    nfeNumber: '000301',
  },
  {
    id: 'stock-008',
    productId: 'prod-003',
    filialId: 'fil-003',
    lote: 'L003H2024',
    expirationDate: addMonths(today, 9),
    quantity: 110,
    unitPrice: 25.00,
    entryDate: '2024-10-20',
    nfeNumber: '000302',
  },
  {
    id: 'stock-009',
    productId: 'prod-005',
    filialId: 'fil-003',
    lote: 'L005I2024',
    expirationDate: addMonths(today, 4), // Vence em 4 meses
    quantity: 75,
    unitPrice: 22.00,
    entryDate: '2024-11-01',
    nfeNumber: '000303',
  },
];
