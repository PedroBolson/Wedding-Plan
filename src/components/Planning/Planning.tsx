import { useState, useEffect, useContext } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../firebase/config';
import { useLoading } from '../../contexts/LoadingContext';
import { ThemeContext } from '../../contexts/ThemeContext';

interface City {
    id?: string;
    name: string;
    state: string;
}

interface PdfDocument {
    id: string;
    name: string;
    url: string;
    uploadedAt: Date;
}

interface Venue {
    id?: string;
    cityId: string;
    name: string;
    address: string;
    phone: string;
    venuePrice: number;
    foodPrice: number;
    drinkPrice: number;
    formats: string;
    installmentPlan: string;
    pdfDocuments: PdfDocument[];
    notes: string;
    isFavorite: boolean;
    favoritedAt?: Date;
    selectedProfessionalIds: string[];
}

interface ProfessionalType {
    id?: string;
    name: string;
}

interface Professional {
    id?: string;
    name: string;
    typeId: string;
    cityId: string;
    price: number;
    paymentOptions: string;
    installmentPlan: string;
    isFavorite: boolean;
    notes: string;
}

interface CityFormData {
    name: string;
    state: string;
}

interface VenueFormData {
    name: string;
    address: string;
    phone: string;
    venuePrice: number;
    foodPrice: number;
    drinkPrice: number;
    formats: string;
    installmentPlan: string;
    notes: string;
    pdfDocuments: PdfDocument[];
}

interface ProfessionalFormData {
    name: string;
    typeId: string;
    price: number;
    paymentOptions: string;
    installmentPlan: string;
    notes: string;
}

const Planning = () => {
    const { colors, darkTheme } = useContext(ThemeContext);
    const [activeView, setActiveView] = useState<'cities' | 'venues' | 'cityProfessionals' | 'professionalTypes'>('cities');
    const [cities, setCities] = useState<City[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [professionalTypes, setProfessionalTypes] = useState<ProfessionalType[]>([]);

    const [selectedCityId, setSelectedCityId] = useState<string | null>(null);

    const [showCityForm, setShowCityForm] = useState(false);
    const [showVenueForm, setShowVenueForm] = useState(false);
    const [showProfessionalForm, setShowProfessionalForm] = useState(false);
    const [showTypeForm, setShowTypeForm] = useState(false);

    const [editingVenueId, setEditingVenueId] = useState<string | null>(null);
    const [editingProfessionalId, setEditingProfessionalId] = useState<string | null>(null);
    const [cityFormData, setCityFormData] = useState<CityFormData>({ name: '', state: '' });
    const [venueFormData, setVenueFormData] = useState<VenueFormData>({
        name: '',
        address: '',
        phone: '',
        venuePrice: 0,
        foodPrice: 0,
        drinkPrice: 0,
        formats: '',
        installmentPlan: '',
        notes: '',
        pdfDocuments: []
    });
    const [professionalFormData, setProfessionalFormData] = useState<ProfessionalFormData>({
        name: '',
        typeId: '',
        price: 0,
        paymentOptions: '',
        installmentPlan: '',
        notes: ''
    });
    const [typeFormData, setTypeFormData] = useState<{ name: string }>({ name: '' });

    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [currentUploads, setCurrentUploads] = useState<{ [key: string]: boolean }>({});

    const [editingTypeId, setEditingTypeId] = useState<string | null>(null);

    const [error, setError] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    const { isLoading, setIsLoading, setLoadingMessage } = useLoading();

    useEffect(() => {
        let isMounted = true;

        const fetchCities = async () => {
            try {
                if (isMounted) {
                    setLoadingMessage("Carregando cidades...");
                    setIsLoading(true);
                }

                const citiesRef = collection(db, 'cities');
                const citiesSnapshot = await getDocs(citiesRef);
                const citiesList = citiesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as City));

                if (isMounted) {
                    setCities(citiesList);
                }
            } catch (err) {
                console.error('Erro ao buscar cidades:', err);
                if (isMounted) {
                    setError('Não foi possível carregar as cidades. Por favor, tente novamente.');
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        if (activeView === 'cities') {
            fetchCities();
        }

        return () => {
            isMounted = false;
        };
    }, [activeView]);

    useEffect(() => {
        const fetchVenues = async () => {
            if (!selectedCityId) return;

            try {
                setLoadingMessage(`Carregando locais de ${cities.find(c => c.id === selectedCityId)?.name || 'cidade selecionada'}...`);
                setIsLoading(true);

                const venuesRef = collection(db, 'venues');
                const q = query(venuesRef, where('cityId', '==', selectedCityId));
                const venuesSnapshot = await getDocs(q);
                const venuesList = venuesSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        isFavorite: data.isFavorite === true,
                        selectedProfessionalIds: data.selectedProfessionalIds || []
                    } as Venue;
                });
                setVenues(venuesList);
            } catch (err) {
                console.error('Erro ao buscar locais:', err);
                setError('Não foi possível carregar os locais. Por favor, tente novamente.');
            } finally {
                setIsLoading(false);
            }
        };

        if (activeView === 'venues') {
            fetchVenues();
        }
    }, [selectedCityId, activeView, cities]);

    useEffect(() => {
        const fetchProfessionals = async () => {
            if (!selectedCityId) return;

            try {
                setLoadingMessage(`Carregando profissionais de ${cities.find(c => c.id === selectedCityId)?.name || 'cidade selecionada'}...`);
                setIsLoading(true);

                const professionalsRef = collection(db, 'professionals');
                const q = query(professionalsRef, where('cityId', '==', selectedCityId));
                const professionalsSnapshot = await getDocs(q);
                const professionalsList = professionalsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    isFavorite: doc.data().isFavorite === true
                } as Professional));
                setProfessionals(professionalsList);

                const typesRef = collection(db, 'professionalTypes');
                const typesSnapshot = await getDocs(typesRef);
                const typesList = typesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as ProfessionalType));
                setProfessionalTypes(typesList);
            } catch (err) {
                console.error('Erro ao buscar profissionais:', err);
                setError('Não foi possível carregar os profissionais. Por favor, tente novamente.');
            } finally {
                setIsLoading(false);
            }
        };

        if (activeView === 'cityProfessionals') {
            fetchProfessionals();
        }
    }, [selectedCityId, activeView, cities]);

    useEffect(() => {
        const fetchProfessionalTypes = async () => {
            try {
                setLoadingMessage("Carregando tipos de profissionais...");
                setIsLoading(true);

                const typesRef = collection(db, 'professionalTypes');
                const typesSnapshot = await getDocs(typesRef);
                const typesList = typesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as ProfessionalType));
                setProfessionalTypes(typesList);
            } catch (err) {
                console.error('Erro ao buscar tipos de profissionais:', err);
                setError('Não foi possível carregar os tipos de profissionais. Por favor, tente novamente.');
            } finally {
                setIsLoading(false);
            }
        };

        if (activeView === 'professionalTypes') {
            fetchProfessionalTypes();
        }
    }, [activeView]);

    // Função para alternar o status de favorito de um local
    const toggleFavorite = async (venue: Venue) => {
        if (!venue.id) return;

        try {
            setLoadingMessage(`Atualizando favorito: ${venue.name}...`);
            setIsLoading(true);

            const newFavoriteStatus = !venue.isFavorite;
            const currentTime = new Date();

            // Atualizar no Firestore
            await updateDoc(doc(db, 'venues', venue.id), {
                isFavorite: newFavoriteStatus,
                favoritedAt: newFavoriteStatus ? currentTime : null
            });

            // Atualizar localmente
            setVenues(venues.map(v =>
                v.id === venue.id
                    ? { ...v, isFavorite: newFavoriteStatus, favoritedAt: newFavoriteStatus ? currentTime : undefined }
                    : v
            ));

        } catch (err) {
            console.error('Erro ao alterar status de favorito:', err);
            setError('Não foi possível atualizar o favorito. Por favor, tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    // Função para alternar o status de favorito de um profissional
    const toggleProfessionalFavorite = async (professional: Professional) => {
        if (!professional.id) return;

        try {
            setLoadingMessage(`Atualizando favorito: ${professional.name}...`);
            setIsLoading(true);

            const newFavoriteStatus = !professional.isFavorite;

            await updateDoc(doc(db, 'professionals', professional.id), {
                isFavorite: newFavoriteStatus
            });

            setProfessionals(professionals.map(p =>
                p.id === professional.id
                    ? { ...p, isFavorite: newFavoriteStatus }
                    : p
            ));

        } catch (err) {
            console.error('Erro ao alterar status de favorito do profissional:', err);
            setError('Não foi possível atualizar o favorito. Por favor, tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    // Funções de navegação
    const handleSelectCity = (cityId: string) => {
        setSelectedCityId(cityId);
        setActiveView('venues');
    };

    const handleBackButton = () => {
        if (activeView === 'venues' || activeView === 'cityProfessionals' || activeView === 'professionalTypes') {
            setActiveView('cities');
            setSelectedCityId(null);
        }
    };

    const handleViewProfessionals = () => {
        setActiveView('cityProfessionals');
    };

    const handleViewVenues = () => {
        setActiveView('venues');
    };

    const handleViewProfessionalTypes = () => {
        setActiveView('professionalTypes');
    };

    const handleCityFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCityFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCityFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!cityFormData.name || !cityFormData.state) {
            setError('Por favor, preencha todos os campos.');
            return;
        }

        try {
            setLoadingMessage("Adicionando nova cidade...");
            setIsLoading(true);

            const citiesRef = collection(db, 'cities');
            const newCityRef = await addDoc(citiesRef, cityFormData);

            setCities([...cities, { ...cityFormData, id: newCityRef.id }]);

            setCityFormData({ name: '', state: '' });
            setShowCityForm(false);
        } catch (err) {
            console.error('Erro ao adicionar cidade:', err);
            setError('Não foi possível adicionar a cidade. Por favor, tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVenueFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const numericFields = ['venuePrice', 'foodPrice', 'drinkPrice'];

        if (numericFields.includes(name)) {
            setVenueFormData(prev => ({
                ...prev,
                [name]: value === '' ? 0 : Number(value)
            }));
        } else {
            setVenueFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleVenueFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isLoading) return;

        if (!selectedCityId || !venueFormData.name) {
            setError('Por favor, preencha pelo menos o nome do local.');
            return;
        }

        try {
            let pdfDocuments = [...venueFormData.pdfDocuments];

            if (editingVenueId) {

                if (selectedFiles.length > 0) {
                    const newDocs = await handleMultipleUploads(editingVenueId);
                    pdfDocuments = [...pdfDocuments, ...newDocs];
                }

                // Atualizar no Firestore
                const venueRef = doc(db, 'venues', editingVenueId);
                await updateDoc(venueRef, {
                    ...venueFormData,
                    pdfDocuments
                });

                setVenues(venues.map(venue =>
                    venue.id === editingVenueId
                        ? {
                            ...venue,
                            ...venueFormData,
                            pdfDocuments
                        }
                        : venue
                ));

            } else {
                const venuesRef = collection(db, 'venues');
                const newVenue = {
                    ...venueFormData,
                    cityId: selectedCityId,
                    isFavorite: false,
                    selectedProfessionalIds: [],
                    pdfDocuments: []
                };

                const newVenueRef = await addDoc(venuesRef, newVenue);
                const venueId = newVenueRef.id;

                if (selectedFiles.length > 0) {
                    pdfDocuments = await handleMultipleUploads(venueId);

                    if (pdfDocuments.length > 0) {
                        await updateDoc(doc(db, 'venues', venueId), { pdfDocuments });
                    }
                }

                setVenues([...venues, {
                    ...newVenue,
                    id: venueId,
                    pdfDocuments
                }]);
            }

            setVenueFormData({
                name: '',
                address: '',
                phone: '',
                venuePrice: 0,
                foodPrice: 0,
                drinkPrice: 0,
                formats: '',
                installmentPlan: '',
                notes: '',
                pdfDocuments: []
            });
            setSelectedFiles([]);
            setEditingVenueId(null);
            setShowVenueForm(false);

        } catch (err) {
            console.error(`Erro ao ${editingVenueId ? 'atualizar' : 'adicionar'} local:`, err);
            setError(`Não foi possível ${editingVenueId ? 'atualizar' : 'adicionar'} o local. Por favor, tente novamente.`);
        }
    };

    const handleEditVenue = (venue: Venue) => {
        setEditingVenueId(venue.id || null);
        setVenueFormData({
            name: venue.name,
            address: venue.address,
            phone: venue.phone,
            venuePrice: venue.venuePrice,
            foodPrice: venue.foodPrice,
            drinkPrice: venue.drinkPrice,
            formats: venue.formats,
            installmentPlan: venue.installmentPlan,
            notes: venue.notes,
            pdfDocuments: venue.pdfDocuments || []
        });
        setSelectedFiles([]);
        setShowVenueForm(true);
    };

    const handleDeletePDF = async (venueId: string, pdfDoc: PdfDocument) => {
        try {
            const fileRef = ref(storage, pdfDoc.url);
            await deleteObject(fileRef);

            // Filtrar o PDF excluído do array de documentos
            const updatedDocs = venueFormData.pdfDocuments.filter(doc => doc.id !== pdfDoc.id);

            // Atualizar no Firestore
            const venueRef = doc(db, 'venues', venueId);
            await updateDoc(venueRef, {
                pdfDocuments: updatedDocs
            });

            // Atualizar estado local
            setVenueFormData({
                ...venueFormData,
                pdfDocuments: updatedDocs
            });

            // Atualizar a lista de venues
            if (venueId) {
                setVenues(venues.map(venue =>
                    venue.id === venueId
                        ? { ...venue, pdfDocuments: updatedDocs }
                        : venue
                ));
            }

            setError(null);
        } catch (err) {
            console.error('Erro ao excluir PDF:', err);
            setError('Não foi possível excluir o arquivo PDF.');
        }
    };

    const handleUploadPDF = async (venueId: string, file: File): Promise<PdfDocument | null> => {
        if (!file) return null;

        const fileId = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
        setCurrentUploads(prev => ({ ...prev, [fileId]: true }));

        try {
            const fileRef = ref(storage, `venues/${venueId}/pdfs/${fileId}`);

            // Upload the file
            await uploadBytes(fileRef, file);

            // Get the download URL
            const downloadURL = await getDownloadURL(fileRef);

            // Create PDF document object
            const pdfDoc: PdfDocument = {
                id: fileId,
                name: file.name,
                url: downloadURL,
                uploadedAt: new Date()
            };

            return pdfDoc;
        } catch (err) {
            console.error('Erro ao fazer upload do PDF:', err);
            setError('Falha ao fazer upload do arquivo PDF.');
            return null;
        } finally {
            setCurrentUploads(prev => {
                const newUploads = { ...prev };
                delete newUploads[fileId];
                return newUploads;
            });
        }
    };

    const handleMultipleUploads = async (venueId: string): Promise<PdfDocument[]> => {
        const uploadResults: PdfDocument[] = [];

        for (const file of selectedFiles) {
            const result = await handleUploadPDF(venueId, file);
            if (result) {
                uploadResults.push(result);
            }
        }

        return uploadResults;
    };

    // Funções de formulário para profissional
    const handleProfessionalFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const numericFields = ['price'];

        if (numericFields.includes(name)) {
            setProfessionalFormData(prev => ({
                ...prev,
                [name]: value === '' ? 0 : Number(value)
            }));
        } else {
            setProfessionalFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleProfessionalFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedCityId || !professionalFormData.name || !professionalFormData.typeId) {
            setError('Por favor, preencha nome e tipo do profissional.');
            return;
        }

        try {
            if (editingProfessionalId) {
                // Atualizar profissional existente
                const professionalRef = doc(db, 'professionals', editingProfessionalId);
                await updateDoc(professionalRef, {
                    name: professionalFormData.name,
                    typeId: professionalFormData.typeId,
                    price: professionalFormData.price,
                    paymentOptions: professionalFormData.paymentOptions,
                    installmentPlan: professionalFormData.installmentPlan,
                    notes: professionalFormData.notes
                });

                // Atualizar estado local
                setProfessionals(professionals.map(prof =>
                    prof.id === editingProfessionalId
                        ? { ...prof, ...professionalFormData }
                        : prof
                ));
            } else {
                // Criar novo profissional
                const professionalsRef = collection(db, 'professionals');
                const newProfessional = {
                    ...professionalFormData,
                    cityId: selectedCityId,
                    isFavorite: false
                };

                const newProfessionalRef = await addDoc(professionalsRef, newProfessional);

                // Adicionar à lista local
                setProfessionals([...professionals, { ...newProfessional, id: newProfessionalRef.id }]);
            }

            // Limpar formulário e fechar modal
            setProfessionalFormData({
                name: '',
                typeId: '',
                price: 0,
                paymentOptions: '',
                installmentPlan: '',
                notes: ''
            });
            setEditingProfessionalId(null);
            setShowProfessionalForm(false);
        } catch (err) {
            console.error(`Erro ao ${editingProfessionalId ? 'atualizar' : 'adicionar'} profissional:`, err);
            setError(`Não foi possível ${editingProfessionalId ? 'atualizar' : 'adicionar'} o profissional. Por favor, tente novamente.`);
        }
    };

    const handleEditProfessional = (professional: Professional) => {
        setEditingProfessionalId(professional.id || null);
        setProfessionalFormData({
            name: professional.name,
            typeId: professional.typeId,
            price: professional.price,
            paymentOptions: professional.paymentOptions || '',
            installmentPlan: professional.installmentPlan || '',
            notes: professional.notes || ''
        });
        setShowProfessionalForm(true);
    };

    // Funções de formulário para tipo de profissional
    const handleTypeFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!typeFormData.name.trim()) {
            setError('Por favor, insira um nome para o tipo de profissional.');
            return;
        }

        try {
            if (editingTypeId) {
                await updateDoc(doc(db, 'professionalTypes', editingTypeId), {
                    name: typeFormData.name
                });

                // Atualizar localmente
                setProfessionalTypes(professionalTypes.map(type =>
                    type.id === editingTypeId ? { ...type, name: typeFormData.name } : type
                ));

            } else {
                // Adicionar novo tipo
                const typesRef = collection(db, 'professionalTypes');
                const newTypeRef = await addDoc(typesRef, {
                    name: typeFormData.name
                });

                // Adicionar à lista local
                setProfessionalTypes([...professionalTypes, {
                    id: newTypeRef.id,
                    name: typeFormData.name
                }]);
            }

            // Limpar formulário e fechar modal
            setTypeFormData({ name: '' });
            setEditingTypeId(null);
            setShowTypeForm(false);

        } catch (err) {
            console.error('Erro ao salvar tipo de profissional:', err);
            setError(`Não foi possível ${editingTypeId ? 'atualizar' : 'adicionar'} o tipo de profissional. Por favor, tente novamente.`);
        }
    };

    // Função para excluir tipo de profissional
    const handleDeleteProfessionalType = async (typeId: string) => {
        try {
            // Verificar se há profissionais usando este tipo
            const professionalsRef = collection(db, 'professionals');
            const q = query(professionalsRef, where('typeId', '==', typeId));
            const professionalsSnapshot = await getDocs(q);

            if (!professionalsSnapshot.empty) {
                setError('Não é possível excluir este tipo pois existem profissionais cadastrados com ele. Remova os profissionais primeiro.');
                setConfirmDelete(null);
                return;
            }

            // Excluir o tipo
            await deleteDoc(doc(db, 'professionalTypes', typeId));

            // Atualizar localmente
            setProfessionalTypes(professionalTypes.filter(type => type.id !== typeId));
            setConfirmDelete(null);

        } catch (err) {
            console.error('Erro ao excluir tipo de profissional:', err);
            setError('Não foi possível excluir o tipo de profissional. Por favor, tente novamente.');
        }
    };

    // Função para excluir cidade
    const handleDeleteCity = async (cityId: string) => {
        try {
            setLoadingMessage("Excluindo cidade...");
            setIsLoading(true);

            await deleteDoc(doc(db, 'cities', cityId));
            setCities(cities.filter(city => city.id !== cityId));
            setConfirmDelete(null);
        } catch (err) {
            console.error('Erro ao excluir cidade:', err);
            setError('Não foi possível excluir a cidade. Verifique se não há locais ou profissionais vinculados a ela.');
        } finally {
            setIsLoading(false);
        }
    };

    // Função para excluir local
    const handleDeleteVenue = async (venueId: string) => {
        try {
            setLoadingMessage("Excluindo local...");
            setIsLoading(true);

            await deleteDoc(doc(db, 'venues', venueId));
            setVenues(venues.filter(venue => venue.id !== venueId));
            setConfirmDelete(null);
        } catch (err) {
            console.error('Erro ao excluir local:', err);
            setError('Não foi possível excluir o local.');
        } finally {
            setIsLoading(false);
        }
    };

    // Função para excluir profissional
    const handleDeleteProfessional = async (professionalId: string) => {
        try {
            setLoadingMessage("Excluindo profissional...");
            setIsLoading(true);

            await deleteDoc(doc(db, 'professionals', professionalId));
            setProfessionals(professionals.filter(prof => prof.id !== professionalId));
            setConfirmDelete(null);
        } catch (err) {
            console.error('Erro ao excluir profissional:', err);
            setError('Não foi possível excluir o profissional.');
        } finally {
            setIsLoading(false);
        }
    };

    // Renderizações condicionais com base no activeView
    const renderContent = () => {

        if (error) {
            return (
                <div className="p-6 rounded-xl shadow-lg border" style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.error + '40',
                }}>
                    <div className="p-4 rounded-lg my-4" style={{
                        backgroundColor: colors.error + '20',
                        color: colors.error
                    }}>
                        💔 {error}
                    </div>
                    <button
                        className="px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 cursor-pointer"
                        style={{
                            backgroundColor: colors.surface,
                            color: colors.text,
                            border: `1px solid ${colors.border}`
                        }}
                        onClick={() => setError(null)}
                    >
                        ✨ Fechar
                    </button>
                </div>
            );
        }

        switch (activeView) {
            case 'cities':
                return (
                    <div className="p-6 rounded-xl shadow-lg border" style={{
                        backgroundColor: colors.surface,
                        borderColor: colors.border
                    }}>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <h2 className="text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent" style={{
                                backgroundImage: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                            }}>
                                🏙️ Cidades dos Sonhos 💕
                            </h2>
                            <button
                                className="px-6 py-3 rounded-lg transition-all duration-200 hover:scale-105 transform cursor-pointer font-semibold"
                                style={{
                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                    color: 'white',
                                    boxShadow: `0 4px 15px ${colors.primary}30`
                                }}
                                onClick={() => setShowCityForm(true)}
                            >
                                ✨ Nova Cidade 💕
                            </button>
                        </div>

                        <div className="mb-6">
                            <button
                                className="px-6 py-3 rounded-lg transition-all duration-200 hover:scale-105 transform cursor-pointer font-medium border"
                                style={{
                                    backgroundColor: colors.accent,
                                    color: colors.text,
                                    borderColor: colors.border
                                }}
                                onClick={handleViewProfessionalTypes}
                            >
                                👨‍💼 Gerenciar Tipos de Profissionais 💼
                            </button>
                        </div>

                        {cities.length === 0 ? (
                            <div className="p-12 rounded-lg text-center" style={{
                                backgroundColor: colors.background,
                                color: colors.textSecondary
                            }}>
                                <p className="text-lg">💔 Nenhuma cidade encontrada. Adicione uma nova cidade para começar!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {cities.map(city => (
                                    <div
                                        key={city.id}
                                        className="p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer relative"
                                        style={{
                                            backgroundColor: colors.background,
                                            borderLeft: `4px solid ${colors.primary}`
                                        }}
                                        onClick={() => handleSelectCity(city.id!)}
                                    >
                                        <h3 className="text-lg font-semibold mb-2" style={{ color: colors.primary }}>
                                            🌟 {city.name}
                                        </h3>
                                        <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
                                            📍 {city.state}
                                        </p>
                                        <button
                                            className="absolute top-3 right-3 p-2 rounded-full transition-all duration-200 hover:scale-110 cursor-pointer"
                                            style={{
                                                backgroundColor: colors.error + '20',
                                                color: colors.error
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setConfirmDelete(`city-${city.id}`);
                                            }}
                                        >
                                            🗑️
                                        </button>

                                        {confirmDelete === `city-${city.id}` && (
                                            <div className="absolute inset-0 rounded-lg p-4 flex flex-col justify-center items-center text-center z-10 border-2" style={{
                                                backgroundColor: colors.surface + 'F0',
                                                backdropFilter: 'blur(8px)',
                                                borderColor: colors.error
                                            }}>
                                                <p className="font-medium mb-4" style={{ color: colors.text }}>
                                                    💔 Tem certeza que deseja excluir esta cidade?
                                                </p>
                                                <div className="flex gap-3">
                                                    <button
                                                        className="px-4 py-2 rounded font-medium min-w-[100px] transition-all duration-200 hover:scale-105 cursor-pointer"
                                                        style={{
                                                            backgroundColor: colors.error,
                                                            color: 'white'
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteCity(city.id!);
                                                        }}
                                                    >
                                                        💔 Sim, excluir
                                                    </button>
                                                    <button
                                                        className="px-4 py-2 rounded transition-all duration-200 hover:scale-105 cursor-pointer text-sm border"
                                                        style={{
                                                            backgroundColor: colors.background,
                                                            color: colors.text,
                                                            borderColor: colors.border
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setConfirmDelete(null);
                                                        }}
                                                    >
                                                        ❌ Cancelar
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {showCityForm && (
                            <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
                                <div style={{
                                    backgroundColor: colors.background,
                                    borderRadius: '0.5rem',
                                    padding: '1.5rem',
                                    width: '100%',
                                    maxWidth: '28rem',
                                    maxHeight: '80vh',
                                    overflowY: 'auto',
                                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                                }}>
                                    <h3 style={{
                                        fontSize: '1.25rem',
                                        fontWeight: '600',
                                        color: colors.primary,
                                        marginBottom: '1rem',
                                        paddingBottom: '0.75rem',
                                        borderBottom: `1px solid ${colors.border}`
                                    }}>Adicionar Nova Cidade</h3>
                                    <form onSubmit={handleCityFormSubmit}>
                                        <div style={{ marginBottom: '1rem' }}>
                                            <label
                                                htmlFor="name"
                                                style={{
                                                    display: 'block',
                                                    marginBottom: '0.5rem',
                                                    fontWeight: '500',
                                                    color: colors.text
                                                }}
                                            >
                                                Nome da Cidade:
                                            </label>
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                value={cityFormData.name}
                                                onChange={handleCityFormChange}
                                                required
                                                style={{
                                                    width: '100%',
                                                    padding: '0.75rem',
                                                    border: `1px solid ${colors.border}`,
                                                    borderRadius: '8px',
                                                    backgroundColor: colors.surface,
                                                    color: colors.text,
                                                    fontSize: '1rem',
                                                    transition: 'border-color 0.2s, box-shadow 0.2s'
                                                }}
                                                onFocus={(e) => {
                                                    const target = e.target as HTMLInputElement;
                                                    target.style.borderColor = colors.primary;
                                                    target.style.boxShadow = `0 0 0 2px ${colors.primary}20`;
                                                }}
                                                onBlur={(e) => {
                                                    const target = e.target as HTMLInputElement;
                                                    target.style.borderColor = colors.border;
                                                    target.style.boxShadow = 'none';
                                                }}
                                            />
                                        </div>
                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <label
                                                htmlFor="state"
                                                style={{
                                                    display: 'block',
                                                    marginBottom: '0.5rem',
                                                    fontWeight: '500',
                                                    color: colors.text
                                                }}
                                            >
                                                Estado:
                                            </label>
                                            <input
                                                type="text"
                                                id="state"
                                                name="state"
                                                value={cityFormData.state}
                                                onChange={handleCityFormChange}
                                                required
                                                maxLength={2}
                                                placeholder="UF"
                                                style={{
                                                    width: '100%',
                                                    padding: '0.75rem',
                                                    border: `1px solid ${colors.border}`,
                                                    borderRadius: '8px',
                                                    backgroundColor: colors.surface,
                                                    color: colors.text,
                                                    fontSize: '1rem',
                                                    transition: 'border-color 0.2s, box-shadow 0.2s'
                                                }}
                                                onFocus={(e) => {
                                                    e.target.style.borderColor = colors.primary;
                                                    e.target.style.boxShadow = `0 0 0 2px ${colors.primary}20`;
                                                }}
                                                onBlur={(e) => {
                                                    e.target.style.borderColor = colors.border;
                                                    e.target.style.boxShadow = 'none';
                                                }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            <button
                                                type="submit"
                                                style={{
                                                    flex: 1,
                                                    backgroundColor: colors.primary,
                                                    color: 'white',
                                                    padding: '0.75rem 1.5rem',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    fontWeight: '500',
                                                    cursor: 'pointer',
                                                    transition: 'background-color 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    (e.target as HTMLButtonElement).style.backgroundColor = colors.primaryHover;
                                                }}
                                                onMouseLeave={(e) => {
                                                    (e.target as HTMLButtonElement).style.backgroundColor = colors.primary;
                                                }}
                                            >
                                                Salvar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowCityForm(false)}
                                                style={{
                                                    flex: 1,
                                                    backgroundColor: colors.surface,
                                                    color: colors.text,
                                                    border: `1px solid ${colors.border}`,
                                                    padding: '0.75rem 1.5rem',
                                                    borderRadius: '8px',
                                                    fontWeight: '500',
                                                    cursor: 'pointer',
                                                    transition: 'background-color 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    (e.target as HTMLButtonElement).style.backgroundColor = colors.surfaceHover;
                                                }}
                                                onMouseLeave={(e) => {
                                                    (e.target as HTMLButtonElement).style.backgroundColor = colors.surface;
                                                }}
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 'venues':
                return (
                    <div className="p-4">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                            <button
                                className="flex items-center gap-2 bg-transparent border-2 text-gray-900 dark:text-gray-100 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 font-medium cursor-pointer transform hover:scale-105"
                                style={{
                                    borderColor: colors.primary,
                                    color: colors.primary
                                }}
                                onClick={handleBackButton}
                            >
                                💕 ← Voltar para Cidades
                            </button>
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
                                🏰 Locais dos Sonhos em {cities.find(c => c.id === selectedCityId)?.name} 💒
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    className="px-4 py-2 rounded-lg font-medium cursor-pointer transform hover:scale-105 transition-all duration-300 shadow-md text-white"
                                    style={{
                                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                        boxShadow: `0 4px 15px ${colors.primary}40`
                                    }}
                                    onClick={handleViewVenues}
                                >
                                    🏰 Locais
                                </button>
                                <button
                                    className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300 cursor-pointer transform hover:scale-105"
                                    onClick={handleViewProfessionals}
                                >
                                    👨‍💼 Profissionais
                                </button>
                                <button
                                    className="px-4 py-2 rounded-lg transition-all duration-300 font-medium cursor-pointer transform hover:scale-105 shadow-md text-white"
                                    style={{
                                        background: `linear-gradient(135deg, ${colors.accent}, ${colors.secondary})`,
                                        boxShadow: `0 4px 15px ${colors.accent}40`
                                    }}
                                    onClick={() => setShowVenueForm(true)}
                                >
                                    ✨ + Novo Local 💕
                                </button>
                            </div>
                        </div>

                        {venues.length === 0 ? (
                            <p style={{ color: colors.textSecondary, textAlign: 'center', padding: '2rem 0' }}>💒 Nenhum local encontrado. Adicione um novo local dos sonhos! ✨</p>
                        ) : (
                            <div
                                className="grid gap-6"
                                style={{
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))'
                                }}
                            >
                                {venues.map(venue => (
                                    <div
                                        key={venue.id}
                                        className="rounded-lg shadow-md transition-all duration-300 p-6 relative transform"
                                        style={{
                                            backgroundColor: colors.surface,
                                            borderLeft: `4px solid ${colors.primary}`,
                                            background: darkTheme
                                                ? `linear-gradient(135deg, ${colors.surface}15, ${colors.primary}08)`
                                                : `linear-gradient(135deg, ${colors.surface}, ${colors.primary}08)`,
                                            boxShadow: `0 4px 6px ${colors.primary}20`,
                                            transform: 'scale(1)'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                                            e.currentTarget.style.boxShadow = `0 8px 25px ${colors.primary}30`;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                            e.currentTarget.style.boxShadow = `0 4px 6px ${colors.primary}20`;
                                        }}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="text-lg font-semibold flex-1" style={{ color: colors.primary }}>
                                                🏰 {venue.name}
                                            </h3>
                                            <button
                                                style={{
                                                    fontSize: '1.5rem',
                                                    transition: 'all 0.3s',
                                                    cursor: 'pointer',
                                                    padding: '0.25rem',
                                                    color: venue.isFavorite ? colors.accent : colors.textSecondary
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.25)'}
                                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleFavorite(venue);
                                                }}
                                                aria-label={venue.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                                            >
                                                {venue.isFavorite ? '💕' : '🤍'}
                                            </button>
                                        </div>
                                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                            <p><strong className="text-gray-900 dark:text-gray-100">📍 Endereço:</strong> {venue.address}</p>
                                            <p><strong className="text-gray-900 dark:text-gray-100">📞 Telefone:</strong> {venue.phone}</p>
                                            <p><strong className="text-gray-900 dark:text-gray-100">💰 Preço do Local:</strong> R$ {venue.venuePrice.toLocaleString('pt-BR')}</p>
                                            <p><strong className="text-gray-900 dark:text-gray-100">🍽️ Preço da Comida:</strong> R$ {venue.foodPrice.toLocaleString('pt-BR')}</p>
                                            <p><strong className="text-gray-900 dark:text-gray-100">🥂 Preço da Bebida:</strong> R$ {venue.drinkPrice.toLocaleString('pt-BR')}</p>
                                            <p><strong className="text-gray-900 dark:text-gray-100" style={{ color: colors.success }}>💎 Total Estimado:</strong> R$ {(venue.venuePrice + venue.foodPrice + venue.drinkPrice).toLocaleString('pt-BR')}</p>
                                            <p><strong className="text-gray-900 dark:text-gray-100">✨ Formatos:</strong> {venue.formats}</p>
                                            <p><strong className="text-gray-900 dark:text-gray-100">💳 Parcelamento:</strong> {venue.installmentPlan}</p>
                                            {venue.pdfDocuments && venue.pdfDocuments.length > 0 && (
                                                <div className="mt-3">
                                                    <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Documentos:</p>
                                                    <ul className="space-y-1">
                                                        {venue.pdfDocuments.map(doc => (
                                                            <li key={doc.id}>
                                                                <a
                                                                    href={doc.url}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="text-blue-600 dark:text-blue-400 hover:underline"
                                                                >
                                                                    {doc.name}
                                                                </a>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                                <strong className="text-gray-900 dark:text-gray-100">Observações:</strong>
                                                <p className="mt-1 whitespace-pre-wrap">{venue.notes || "Nenhuma observação"}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 mt-4">
                                            <button
                                                className="px-4 py-2 rounded transition-all duration-300 font-medium cursor-pointer transform hover:scale-105 shadow-md text-white"
                                                style={{
                                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                                    boxShadow: `0 4px 15px ${colors.primary}40`
                                                }}
                                                onClick={() => handleEditVenue(venue)}
                                            >
                                                ✏️ Editar
                                            </button>
                                            <button
                                                className="bg-gray-100 dark:bg-gray-700 border px-4 py-2 rounded hover:bg-red-600 hover:text-white dark:hover:bg-red-600 transition-all duration-300 cursor-pointer transform hover:scale-105"
                                                style={{
                                                    color: colors.error,
                                                    borderColor: colors.error
                                                }}
                                                onClick={() => setConfirmDelete(`venue-${venue.id}`)}
                                            >
                                                🗑️ Excluir
                                            </button>
                                        </div>

                                        {confirmDelete === `venue-${venue.id}` && (
                                            <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-95 backdrop-blur-sm rounded-lg p-4 flex flex-col justify-center items-center text-center z-10 border-2" style={{ borderColor: colors.error }}>
                                                <p className="text-gray-900 dark:text-gray-100 font-medium mb-4">💔 Tem certeza que deseja excluir este local dos sonhos?</p>
                                                <div className="flex gap-3">
                                                    <button
                                                        className="hover:bg-red-700 text-white px-4 py-2 rounded font-medium min-w-[100px] cursor-pointer transition-all duration-300 transform hover:scale-105"
                                                        style={{ backgroundColor: colors.error }}
                                                        onClick={() => handleDeleteVenue(venue.id!)}
                                                    >
                                                        💔 Sim
                                                    </button>
                                                    <button
                                                        className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 px-4 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300 min-w-[100px] cursor-pointer transform hover:scale-105"
                                                        onClick={() => setConfirmDelete(null)}
                                                    >
                                                        💕 Não
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {showVenueForm && (
                            <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-xl border-2" style={{ borderColor: colors.primary }}>
                                    <h3 className="text-xl font-semibold mb-4 pb-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
                                        {editingVenueId ? '✏️ Editar Local dos Sonhos 💒' : '✨ Adicionar Novo Local dos Sonhos 💕'}
                                    </h3>
                                    <form onSubmit={handleVenueFormSubmit}>
                                        <div className="mb-4">
                                            <label htmlFor="name" className="block mb-2 font-medium text-gray-900 dark:text-gray-100">🏰 Nome do Local:</label>
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                value={venueFormData.name}
                                                onChange={handleVenueFormChange}
                                                required
                                                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 transition-all duration-300 cursor-text focus:outline-none"
                                                style={{
                                                    borderColor: colors.border,
                                                    '--tw-ring-color': colors.primary
                                                } as React.CSSProperties}
                                            />
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="address" className="block mb-2 font-medium text-gray-900 dark:text-gray-100">📍 Endereço:</label>
                                            <input
                                                type="text"
                                                id="address"
                                                name="address"
                                                value={venueFormData.address}
                                                onChange={handleVenueFormChange}
                                                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 transition-all duration-300 cursor-text focus:outline-none"
                                                style={{
                                                    borderColor: colors.border,
                                                    '--tw-ring-color': colors.primary
                                                } as React.CSSProperties}
                                            />
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="phone" className="block mb-2 font-medium text-gray-900 dark:text-gray-100">📞 Telefone:</label>
                                            <input
                                                type="text"
                                                id="phone"
                                                name="phone"
                                                value={venueFormData.phone}
                                                onChange={handleVenueFormChange}
                                                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 transition-all duration-300 cursor-text focus:outline-none"
                                                style={{
                                                    borderColor: colors.border,
                                                    '--tw-ring-color': colors.primary
                                                } as React.CSSProperties}
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                            <div>
                                                <label htmlFor="venuePrice" className="block mb-2 font-medium text-gray-900 dark:text-gray-100">Preço do Local:</label>
                                                <input
                                                    type="number"
                                                    id="venuePrice"
                                                    name="venuePrice"
                                                    value={venueFormData.venuePrice}
                                                    onChange={handleVenueFormChange}
                                                    min="0"
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="foodPrice" className="block mb-2 font-medium text-gray-900 dark:text-gray-100">Preço da Comida:</label>
                                                <input
                                                    type="number"
                                                    id="foodPrice"
                                                    name="foodPrice"
                                                    value={venueFormData.foodPrice}
                                                    onChange={handleVenueFormChange}
                                                    min="0"
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="drinkPrice" className="block mb-2 font-medium text-gray-900 dark:text-gray-100">Preço da Bebida:</label>
                                                <input
                                                    type="number"
                                                    id="drinkPrice"
                                                    name="drinkPrice"
                                                    value={venueFormData.drinkPrice}
                                                    onChange={handleVenueFormChange}
                                                    min="0"
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                                />
                                            </div>
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="formats" className="block mb-2 font-medium text-gray-900 dark:text-gray-100">Formatos:</label>
                                            <input
                                                type="text"
                                                id="formats"
                                                name="formats"
                                                value={venueFormData.formats}
                                                onChange={handleVenueFormChange}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                            />
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="installmentPlan" className="block mb-2 font-medium text-gray-900 dark:text-gray-100">Plano de Parcelamento:</label>
                                            <input
                                                type="text"
                                                id="installmentPlan"
                                                name="installmentPlan"
                                                value={venueFormData.installmentPlan}
                                                onChange={handleVenueFormChange}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                            />
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="notes" className="block mb-2 font-medium text-gray-900 dark:text-gray-100">Observações:</label>
                                            <textarea
                                                id="notes"
                                                name="notes"
                                                value={venueFormData.notes}
                                                onChange={handleVenueFormChange}
                                                rows={4}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
                                            ></textarea>
                                        </div>
                                        <div className="mb-4">
                                            <label className="block mb-2 font-medium text-gray-900 dark:text-gray-100">Orçamentos/Detalhes (PDFs):</label>
                                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                                                <input
                                                    type="file"
                                                    accept="application/pdf"
                                                    multiple
                                                    onChange={(e) => {
                                                        const files = e.target.files;
                                                        if (files) {
                                                            setSelectedFiles(Array.from(files));
                                                        }
                                                    }}
                                                    className="w-full text-gray-900 dark:text-gray-100"
                                                />
                                                {selectedFiles.length > 0 && (
                                                    <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">{selectedFiles.length} arquivo(s) selecionado(s)</p>
                                                )}
                                            </div>

                                            {venueFormData.pdfDocuments && venueFormData.pdfDocuments.length > 0 && (
                                                <div className="mt-4">
                                                    <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Documentos existentes:</p>
                                                    <ul className="space-y-2">
                                                        {venueFormData.pdfDocuments.map(doc => (
                                                            <li key={doc.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                                                <a href={doc.url} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{doc.name}</a>
                                                                <button
                                                                    type="button"
                                                                    className="text-red-600 dark:text-red-400 hover:underline text-sm"
                                                                    onClick={() => handleDeletePDF(editingVenueId!, doc)}
                                                                >
                                                                    Remover
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>

                                        {Object.keys(currentUploads).length > 0 && (
                                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm mb-4 italic">
                                                <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-600 rounded-full animate-spin"></div>
                                                Fazendo upload de {Object.keys(currentUploads).length} arquivo(s)...
                                            </div>
                                        )}
                                        <div className="flex gap-3">
                                            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50" disabled={isLoading}>
                                                {editingVenueId ? 'Atualizar' : 'Salvar'}
                                            </button>
                                            <button
                                                type="button"
                                                className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 px-6 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                                onClick={() => {
                                                    setShowVenueForm(false);
                                                    setEditingVenueId(null);
                                                    setVenueFormData({
                                                        name: '',
                                                        address: '',
                                                        phone: '',
                                                        venuePrice: 0,
                                                        foodPrice: 0,
                                                        drinkPrice: 0,
                                                        formats: '',
                                                        installmentPlan: '',
                                                        notes: '',
                                                        pdfDocuments: []
                                                    });
                                                    setSelectedFiles([]);
                                                }}
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 'cityProfessionals':
                return (
                    <div className="p-4">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                            <button
                                className="flex items-center gap-2 bg-transparent border-2 text-gray-900 dark:text-gray-100 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 font-medium cursor-pointer transform hover:scale-105"
                                style={{
                                    borderColor: colors.primary,
                                    color: colors.primary
                                }}
                                onClick={handleBackButton}
                            >
                                💕 ← Voltar para Cidades
                            </button>
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
                                👨‍💼 Profissionais dos Sonhos em {cities.find(c => c.id === selectedCityId)?.name} ✨
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300 cursor-pointer transform hover:scale-105"
                                    onClick={handleViewVenues}
                                >
                                    🏰 Locais
                                </button>
                                <button
                                    className="px-4 py-2 rounded-lg font-medium cursor-pointer transform hover:scale-105 transition-all duration-300 shadow-md text-white"
                                    style={{
                                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                        boxShadow: `0 4px 15px ${colors.primary}40`
                                    }}
                                    onClick={handleViewProfessionals}
                                >
                                    👨‍💼 Profissionais
                                </button>
                                <button
                                    className="px-4 py-2 rounded-lg transition-all duration-300 font-medium cursor-pointer transform hover:scale-105 shadow-md text-white"
                                    style={{
                                        background: `linear-gradient(135deg, ${colors.accent}, ${colors.secondary})`,
                                        boxShadow: `0 4px 15px ${colors.accent}40`
                                    }}
                                    onClick={() => setShowProfessionalForm(true)}
                                >
                                    ✨ + Novo Profissional 💼
                                </button>
                            </div>
                        </div>

                        {professionals.length === 0 ? (
                            <p style={{ color: colors.textSecondary, textAlign: 'center', padding: '2rem 0' }}>👨‍💼 Nenhum profissional encontrado. Adicione um novo profissional dos sonhos! ✨</p>
                        ) : (
                            <div
                                className="grid gap-6"
                                style={{
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'
                                }}
                            >
                                {professionals.map(professional => (
                                    <div
                                        key={professional.id}
                                        className="rounded-lg shadow-md transition-all duration-300 p-6 relative transform"
                                        style={{
                                            backgroundColor: colors.surface,
                                            borderLeft: `4px solid ${colors.secondary}`,
                                            background: darkTheme
                                                ? `linear-gradient(135deg, ${colors.surface}15, ${colors.secondary}08)`
                                                : `linear-gradient(135deg, ${colors.surface}, ${colors.secondary}08)`,
                                            boxShadow: `0 4px 6px ${colors.secondary}20`,
                                            transform: 'scale(1)'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                                            e.currentTarget.style.boxShadow = `0 8px 25px ${colors.secondary}30`;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                            e.currentTarget.style.boxShadow = `0 4px 6px ${colors.secondary}20`;
                                        }}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="text-lg font-semibold flex-1" style={{ color: colors.primary }}>
                                                👨‍💼 {professional.name}
                                            </h3>
                                            <button
                                                style={{
                                                    fontSize: '1.5rem',
                                                    transition: 'all 0.3s',
                                                    cursor: 'pointer',
                                                    padding: '0.25rem',
                                                    color: professional.isFavorite ? colors.accent : colors.textSecondary
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.25)'}
                                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                onClick={() => toggleProfessionalFavorite(professional)}
                                                aria-label={professional.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                                            >
                                                {professional.isFavorite ? '💕' : '🤍'}
                                            </button>
                                        </div>
                                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                            <p>
                                                <strong className="text-gray-900 dark:text-gray-100">💼 Tipo:</strong> {
                                                    professionalTypes.find(t => t.id === professional.typeId)?.name || 'Não especificado'
                                                }
                                            </p>
                                            <p><strong className="text-gray-900 dark:text-gray-100">💰 Preço:</strong> R$ {professional.price.toLocaleString('pt-BR')}</p>
                                            <p><strong className="text-gray-900 dark:text-gray-100">💳 Opções de Pagamento:</strong> {professional.paymentOptions || 'Não especificado'}</p>
                                            <p><strong className="text-gray-900 dark:text-gray-100">📅 Parcelamento:</strong> {professional.installmentPlan || 'Não especificado'}</p>
                                            {professional.notes && (
                                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                                    <strong className="text-gray-900 dark:text-gray-100">📝 Observações:</strong>
                                                    <p className="mt-1 whitespace-pre-wrap">{professional.notes}</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2 mt-4">
                                            <button
                                                className="px-4 py-2 rounded transition-all duration-300 font-medium cursor-pointer transform hover:scale-105 shadow-md text-white"
                                                style={{
                                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                                    boxShadow: `0 4px 15px ${colors.primary}40`
                                                }}
                                                onClick={() => handleEditProfessional(professional)}
                                            >
                                                ✏️ Editar
                                            </button>
                                            <button
                                                className="bg-gray-100 dark:bg-gray-700 border px-4 py-2 rounded hover:bg-red-600 hover:text-white dark:hover:bg-red-600 transition-all duration-300 cursor-pointer transform hover:scale-105"
                                                style={{
                                                    color: colors.error,
                                                    borderColor: colors.error
                                                }}
                                                onClick={() => setConfirmDelete(`professional-${professional.id}`)}
                                            >
                                                🗑️ Excluir
                                            </button>
                                        </div>

                                        {confirmDelete === `professional-${professional.id}` && (
                                            <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-95 backdrop-blur-sm rounded-lg p-4 flex flex-col justify-center items-center text-center z-10 border-2" style={{ borderColor: colors.error }}>
                                                <p className="text-gray-900 dark:text-gray-100 font-medium mb-4">💔 Tem certeza que deseja excluir este profissional?</p>
                                                <div className="flex gap-3">
                                                    <button
                                                        className="hover:bg-red-700 text-white px-4 py-2 rounded font-medium min-w-[100px] cursor-pointer transition-all duration-300 transform hover:scale-105"
                                                        style={{ backgroundColor: colors.error }}
                                                        onClick={() => handleDeleteProfessional(professional.id!)}
                                                    >
                                                        💔 Sim
                                                    </button>
                                                    <button
                                                        className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 px-4 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300 min-w-[100px] cursor-pointer transform hover:scale-105"
                                                        onClick={() => setConfirmDelete(null)}
                                                    >
                                                        💕 Não
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {showProfessionalForm && (
                            <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-xl border-2" style={{ borderColor: colors.primary }}>
                                    <h3 className="text-xl font-semibold mb-4 pb-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
                                        {editingProfessionalId ? '✏️ Editar Profissional dos Sonhos 👨‍💼' : '✨ Adicionar Novo Profissional 💼'}
                                    </h3>
                                    <form onSubmit={handleProfessionalFormSubmit}>
                                        <div className="mb-4">
                                            <label htmlFor="name" className="block mb-2 font-medium text-gray-900 dark:text-gray-100">Nome:</label>
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                value={professionalFormData.name}
                                                onChange={handleProfessionalFormChange}
                                                required
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                            />
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="typeId" className="block mb-2 font-medium text-gray-900 dark:text-gray-100">Tipo de Profissional:</label>
                                            <select
                                                id="typeId"
                                                name="typeId"
                                                value={professionalFormData.typeId}
                                                onChange={handleProfessionalFormChange}
                                                required
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 appearance-none"
                                            >
                                                <option value="">Selecione um tipo</option>
                                                {professionalTypes.map(type => (
                                                    <option key={type.id} value={type.id}>
                                                        {type.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="price" className="block mb-2 font-medium text-gray-900 dark:text-gray-100">Preço:</label>
                                            <input
                                                type="number"
                                                id="price"
                                                name="price"
                                                value={professionalFormData.price}
                                                onChange={handleProfessionalFormChange}
                                                min="0"
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                            />
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="paymentOptions" className="block mb-2 font-medium text-gray-900 dark:text-gray-100">Opções de Pagamento:</label>
                                            <input
                                                type="text"
                                                id="paymentOptions"
                                                name="paymentOptions"
                                                value={professionalFormData.paymentOptions}
                                                onChange={handleProfessionalFormChange}
                                                placeholder="Ex: À vista com 10% de desconto, Parcelado sem juros, etc."
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                            />
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="installmentPlan" className="block mb-2 font-medium text-gray-900 dark:text-gray-100">Plano de Parcelamento:</label>
                                            <input
                                                type="text"
                                                id="installmentPlan"
                                                name="installmentPlan"
                                                value={professionalFormData.installmentPlan}
                                                onChange={handleProfessionalFormChange}
                                                placeholder="Ex: Em até 12x no cartão"
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                            />
                                        </div>
                                        <div className="mb-6">
                                            <label htmlFor="notes" className="block mb-2 font-medium text-gray-900 dark:text-gray-100">Observações sobre os serviços:</label>
                                            <textarea
                                                id="notes"
                                                name="notes"
                                                value={professionalFormData.notes}
                                                onChange={handleProfessionalFormChange}
                                                rows={4}
                                                placeholder="Inclui itens adicionais? Detalhes sobre o pacote? Outras informações relevantes?"
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
                                            ></textarea>
                                        </div>
                                        <div className="flex gap-3">
                                            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50" disabled={isLoading}>
                                                Salvar
                                            </button>
                                            <button
                                                type="button"
                                                className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 px-6 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                                onClick={() => {
                                                    setShowProfessionalForm(false);
                                                    setEditingProfessionalId(null);
                                                    setProfessionalFormData({
                                                        name: '',
                                                        typeId: '',
                                                        price: 0,
                                                        paymentOptions: '',
                                                        installmentPlan: '',
                                                        notes: ''
                                                    });
                                                }}
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 'professionalTypes':
                return (
                    <div className="p-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <button
                                className="flex items-center gap-2 bg-transparent border-2 text-gray-900 dark:text-gray-100 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 font-medium cursor-pointer transform hover:scale-105"
                                style={{
                                    borderColor: colors.primary,
                                    color: colors.primary
                                }}
                                onClick={handleBackButton}
                            >
                                💕 ← Voltar para Cidades
                            </button>
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
                                💼 Tipos de Profissionais dos Sonhos ✨
                            </h2>
                            <button
                                className="px-4 py-2 rounded-lg transition-all duration-300 font-medium cursor-pointer transform hover:scale-105 shadow-md text-white"
                                style={{
                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                    boxShadow: `0 4px 15px ${colors.primary}40`
                                }}
                                onClick={() => setShowTypeForm(true)}
                            >
                                ✨ + Novo Tipo 💼
                            </button>
                        </div>

                        {professionalTypes.length === 0 ? (
                            <p style={{ color: colors.textSecondary, textAlign: 'center', padding: '2rem 0' }}>💼 Nenhum tipo encontrado. Adicione um novo tipo de profissional! ✨</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {professionalTypes.map(type => (
                                    <div
                                        key={type.id}
                                        className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2 p-6 relative border-l-4 transform hover:scale-105"
                                        style={{
                                            borderLeftColor: colors.accent,
                                            background: darkTheme
                                                ? `linear-gradient(135deg, ${colors.surface}15, ${colors.accent}08)`
                                                : `linear-gradient(135deg, ${colors.surface}, ${colors.accent}08)`
                                        }}
                                    >
                                        <div className="flex-1 mb-4">
                                            <h3 className="text-lg font-semibold mb-2" style={{ color: colors.primary }}>
                                                💼 {type.name}
                                            </h3>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <button
                                                className="px-4 py-2 rounded transition-all duration-300 font-medium cursor-pointer transform hover:scale-105 shadow-md text-white"
                                                style={{
                                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                                    boxShadow: `0 4px 15px ${colors.primary}40`
                                                }}
                                                onClick={() => {
                                                    setTypeFormData({ name: type.name });
                                                    setEditingTypeId(type.id!);
                                                    setShowTypeForm(true);
                                                }}
                                            >
                                                ✏️ Editar
                                            </button>
                                            <button
                                                className="bg-gray-100 dark:bg-gray-700 border px-4 py-2 rounded hover:bg-red-600 hover:text-white dark:hover:bg-red-600 transition-all duration-300 cursor-pointer transform hover:scale-105"
                                                style={{
                                                    color: colors.error,
                                                    borderColor: colors.error
                                                }}
                                                onClick={() => setConfirmDelete(`type-${type.id}`)}
                                            >
                                                🗑️ Excluir
                                            </button>
                                        </div>

                                        {confirmDelete === `type-${type.id}` && (
                                            <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-95 backdrop-blur-sm rounded-lg p-4 flex flex-col justify-center items-center text-center z-10 border-2" style={{ borderColor: colors.error }}>
                                                <p className="text-gray-900 dark:text-gray-100 font-medium mb-4">💔 Tem certeza que deseja excluir este tipo?</p>
                                                <div className="flex gap-3">
                                                    <button
                                                        className="hover:bg-red-700 text-white px-4 py-2 rounded font-medium min-w-[100px] cursor-pointer transition-all duration-300 transform hover:scale-105"
                                                        style={{ backgroundColor: colors.error }}
                                                        onClick={() => handleDeleteProfessionalType(type.id!)}
                                                    >
                                                        💔 Sim
                                                    </button>
                                                    <button
                                                        className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 px-4 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300 min-w-[100px] cursor-pointer transform hover:scale-105"
                                                        onClick={() => setConfirmDelete(null)}
                                                    >
                                                        💕 Não
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {
                            showTypeForm && (
                                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-xl border-2" style={{ borderColor: colors.primary }}>
                                        <h3 className="text-xl font-semibold mb-4 pb-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
                                            {editingTypeId ? '✏️ Editar Tipo de Profissional 💼' : '✨ Adicionar Novo Tipo 💼'}
                                        </h3>
                                        <form onSubmit={handleTypeFormSubmit}>
                                            <div className="mb-6">
                                                <label htmlFor="name" className="block mb-2 font-medium text-gray-900 dark:text-gray-100">💼 Nome do Tipo:</label>
                                                <input
                                                    type="text"
                                                    id="name"
                                                    name="name"
                                                    value={typeFormData.name}
                                                    onChange={(e) => setTypeFormData({ name: e.target.value })}
                                                    required
                                                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 transition-all duration-300 cursor-text focus:outline-none"
                                                    style={{
                                                        borderColor: colors.border,
                                                        '--tw-ring-color': colors.primary
                                                    } as React.CSSProperties}
                                                />
                                            </div>
                                            <div className="flex gap-3">
                                                <button
                                                    type="submit"
                                                    className="flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-300 cursor-pointer transform hover:scale-105 shadow-md text-white"
                                                    style={{
                                                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                                        boxShadow: `0 4px 15px ${colors.primary}40`
                                                    }}
                                                >
                                                    💕 Salvar
                                                </button>
                                                <button
                                                    type="button"
                                                    className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 px-6 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300 cursor-pointer transform hover:scale-105"
                                                    onClick={() => {
                                                        setShowTypeForm(false);
                                                        setEditingTypeId(null);
                                                        setTypeFormData({ name: '' });
                                                    }}
                                                >
                                                    ❌ Cancelar
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )
                        }
                    </div >
                );

            default:
                return null;
        }
    };

    return (
        <div className="planning-container">
            {renderContent()}
        </div>
    );
};

export default Planning;