import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from './config';

// Função para inicializar o banco de dados com alguns dados de exemplo
export const initializeDatabase = async () => {
    try {
        // Adicionar algumas cidades
        const citiesRef = collection(db, 'cities');
        const cityDocs = await Promise.all([
            addDoc(citiesRef, { name: 'São Paulo', state: 'SP' }),
            addDoc(citiesRef, { name: 'Rio de Janeiro', state: 'RJ' }),
            addDoc(citiesRef, { name: 'Belo Horizonte', state: 'MG' })
        ]);

        console.log('Cidades adicionadas com sucesso!');

        // Adicionar tipos de profissionais
        const typesRef = collection(db, 'professionalTypes');
        const typeDocs = await Promise.all([
            addDoc(typesRef, { name: 'Cerimonialista' }),
            addDoc(typesRef, { name: 'DJ' }),
            addDoc(typesRef, { name: 'Fotógrafo' }),
            addDoc(typesRef, { name: 'Decorador' })
        ]);

        console.log('Tipos de profissionais adicionados com sucesso!');

        // Adicionar alguns profissionais (agora vinculados às cidades)
        const professionalsRef = collection(db, 'professionals');
        await Promise.all([
            // Profissionais de São Paulo
            addDoc(professionalsRef, {
                typeId: typeDocs[0].id,
                cityId: cityDocs[0].id,  // São Paulo
                name: 'Ana Eventos',
                price: 3500,
                formats: 'Acompanhamento completo incluindo pré-evento',
                installmentPlan: 'Até 3x sem juros',
                isFavorite: false
            }),
            addDoc(professionalsRef, {
                typeId: typeDocs[1].id,
                cityId: cityDocs[0].id,  // São Paulo
                name: 'DJ Carlos',
                price: 2500,
                formats: '6 horas de evento, inclui iluminação',
                installmentPlan: 'À vista com 10% de desconto',
                isFavorite: false
            }),
            // Profissionais do Rio de Janeiro
            addDoc(professionalsRef, {
                typeId: typeDocs[2].id,
                cityId: cityDocs[1].id,  // Rio de Janeiro
                name: 'Studio Fotografias RJ',
                price: 4500,
                formats: 'Álbum digital + 100 fotos impressas',
                installmentPlan: 'Até 6x sem juros',
                isFavorite: false
            }),
            addDoc(professionalsRef, {
                typeId: typeDocs[3].id,
                cityId: cityDocs[1].id,  // Rio de Janeiro
                name: 'Decorações Carioca',
                price: 7500,
                formats: 'Decoração completa incluindo flores naturais',
                installmentPlan: 'Até 5x sem juros',
                isFavorite: false
            })
        ]);

        console.log('Profissionais adicionados com sucesso!');

        // Adicionar alguns locais
        const venuesRef = collection(db, 'venues');
        await Promise.all([
            addDoc(venuesRef, {
                cityId: cityDocs[0].id,
                name: 'Buffet Jardins',
                address: 'R. dos Jardins, 123 - Jardins, São Paulo',
                phone: '(11) 99999-9999',
                venuePrice: 15000,
                foodPrice: 22000,
                drinkPrice: 8000,
                formats: 'Até 200 convidados, ambiente climatizado',
                installmentPlan: 'Até 10x sem juros',
                pdfUrl: null,
                notes: 'Possui estacionamento e serviço de manobrista.',
                isFavorite: false,
                selectedProfessionalIds: [] // Array para armazenar IDs de profissionais selecionados
            }),
            addDoc(venuesRef, {
                cityId: cityDocs[1].id,
                name: 'Casa de Festas Copacabana',
                address: 'Av. Atlântica, 500 - Copacabana, Rio de Janeiro',
                phone: '(21) 88888-8888',
                venuePrice: 18000,
                foodPrice: 25000,
                drinkPrice: 12000,
                formats: 'Até 150 convidados, vista para o mar',
                installmentPlan: 'Até 12x sem juros',
                pdfUrl: null,
                notes: 'Vista deslumbrante para o mar. Estacionamento não incluso.',
                isFavorite: false,
                selectedProfessionalIds: [] // Array para armazenar IDs de profissionais selecionados
            })
        ]);

        console.log('Locais adicionados com sucesso!');

        // Criar um documento de configuração para marcar que o banco já foi inicializado
        await setDoc(doc(db, 'system', 'config'), {
            initialized: true,
            initDate: new Date(),
            version: '1.0'
        });

        return true;
    } catch (error) {
        console.error('Erro ao inicializar o banco de dados:', error);
        return false;
    }
};