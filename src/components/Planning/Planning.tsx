import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import './Planning.css';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../firebase/config';
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

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    useEffect(() => {
        const fetchCities = async () => {
            setLoading(true);
            try {
                const citiesRef = collection(db, 'cities');
                const citiesSnapshot = await getDocs(citiesRef);
                const citiesList = citiesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as City));
                setCities(citiesList);
            } catch (err) {
                console.error('Erro ao buscar cidades:', err);
                setError('Não foi possível carregar as cidades. Por favor, tente novamente.');
            } finally {
                setLoading(false);
            }
        };

        if (activeView === 'cities') {
            fetchCities();
        }
    }, [activeView]);

    useEffect(() => {
        const fetchVenues = async () => {
            if (!selectedCityId) return;

            setLoading(true);
            try {
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
                setLoading(false);
            }
        };

        if (activeView === 'venues') {
            fetchVenues();
        }
    }, [selectedCityId, activeView]);

    useEffect(() => {
        const fetchProfessionals = async () => {
            if (!selectedCityId) return;

            setLoading(true);
            try {
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
                setLoading(false);
            }
        };

        if (activeView === 'cityProfessionals') {
            fetchProfessionals();
        }
    }, [selectedCityId, activeView]);

    useEffect(() => {
        const fetchProfessionalTypes = async () => {
            setLoading(true);
            try {
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
                setLoading(false);
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
        }
    };

    // Função para alternar o status de favorito de um profissional
    const toggleProfessionalFavorite = async (professional: Professional) => {
        if (!professional.id) return;

        try {
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

    // Funções de formulário para cidade
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
            const citiesRef = collection(db, 'cities');
            const newCityRef = await addDoc(citiesRef, cityFormData);

            setCities([...cities, { ...cityFormData, id: newCityRef.id }]);

            // Limpar formulário e fechar modal
            setCityFormData({ name: '', state: '' });
            setShowCityForm(false);
        } catch (err) {
            console.error('Erro ao adicionar cidade:', err);
            setError('Não foi possível adicionar a cidade. Por favor, tente novamente.');
        }
    };

    // Funções de formulário para local (venue)
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
            // Deletar do Firebase Storage
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
            // Create a reference to the file in Firebase Storage
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
            const professionalsRef = collection(db, 'professionals');
            const newProfessional = {
                ...professionalFormData,
                cityId: selectedCityId,
                isFavorite: false
            };

            const newProfessionalRef = await addDoc(professionalsRef, newProfessional);

            // Adicionar à lista local
            setProfessionals([...professionals, { ...newProfessional, id: newProfessionalRef.id }]);

            setProfessionalFormData({
                name: '',
                typeId: '',
                price: 0,
                paymentOptions: '',
                installmentPlan: '',
                notes: ''
            });
            setShowProfessionalForm(false);
        } catch (err) {
            console.error('Erro ao adicionar profissional:', err);
            setError('Não foi possível adicionar o profissional. Por favor, tente novamente.');
        }
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
            await deleteDoc(doc(db, 'cities', cityId));
            setCities(cities.filter(city => city.id !== cityId));
            setConfirmDelete(null);
        } catch (err) {
            console.error('Erro ao excluir cidade:', err);
            setError('Não foi possível excluir a cidade. Verifique se não há locais ou profissionais vinculados a ela.');
        }
    };

    // Função para excluir local
    const handleDeleteVenue = async (venueId: string) => {
        try {
            await deleteDoc(doc(db, 'venues', venueId));
            setVenues(venues.filter(venue => venue.id !== venueId));
            setConfirmDelete(null);
        } catch (err) {
            console.error('Erro ao excluir local:', err);
            setError('Não foi possível excluir o local.');
        }
    };

    // Função para excluir profissional
    const handleDeleteProfessional = async (professionalId: string) => {
        try {
            await deleteDoc(doc(db, 'professionals', professionalId));
            setProfessionals(professionals.filter(prof => prof.id !== professionalId));
            setConfirmDelete(null);
        } catch (err) {
            console.error('Erro ao excluir profissional:', err);
            setError('Não foi possível excluir o profissional.');
        }
    };

    // Renderizações condicionais com base no activeView
    const renderContent = () => {
        if (loading) {
            return <div className="loading">Carregando...</div>;
        }

        if (error) {
            return (
                <>
                    <div className="error">{error}</div>
                    <button className="standard-button" onClick={() => setError(null)}>Fechar</button>
                </>
            );
        }

        switch (activeView) {
            case 'cities':
                return (
                    <div className="cities-grid">
                        <div className="section-header">
                            <h2>Cidades</h2>
                            <button
                                className="add-button"
                                onClick={() => setShowCityForm(true)}
                            >
                                + Nova Cidade
                            </button>
                        </div>

                        <div className="planning-actions">
                            <button
                                className="secondary-button"
                                onClick={handleViewProfessionalTypes}
                            >
                                <i className="icon-manage"></i> Gerenciar Tipos de Profissionais
                            </button>
                        </div>

                        {cities.length === 0 ? (
                            <p>Nenhuma cidade encontrada. Adicione uma nova cidade.</p>
                        ) : (
                            <div className="grid">
                                {cities.map(city => (
                                    <div key={city.id} className="card city-card">
                                        <div className="card-content" onClick={() => handleSelectCity(city.id!)}>
                                            <h3>{city.name}</h3>
                                            <p>{city.state}</p>
                                        </div>
                                        <button
                                            className="delete-button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setConfirmDelete(`city-${city.id}`);
                                            }}
                                        >
                                            Excluir
                                        </button>

                                        {confirmDelete === `city-${city.id}` && (
                                            <div className="confirm-delete">
                                                <p>Tem certeza? Esta ação não pode ser desfeita.</p>
                                                <div className="confirm-buttons">
                                                    <button
                                                        className="confirm-yes"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteCity(city.id!);
                                                        }}
                                                    >
                                                        Sim, excluir
                                                    </button>
                                                    <button
                                                        className="confirm-no"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setConfirmDelete(null);
                                                        }}
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {showCityForm && (
                            <div className="modal-overlay">
                                <div className="modal-content">
                                    <h3>Adicionar Nova Cidade</h3>
                                    <form onSubmit={handleCityFormSubmit}>
                                        <div className="form-group">
                                            <label htmlFor="name">Nome da Cidade:</label>
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                value={cityFormData.name}
                                                onChange={handleCityFormChange}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="state">Estado:</label>
                                            <input
                                                type="text"
                                                id="state"
                                                name="state"
                                                value={cityFormData.state}
                                                onChange={handleCityFormChange}
                                                required
                                                maxLength={2}
                                                placeholder="UF"
                                            />
                                        </div>
                                        <div className="form-buttons">
                                            <button type="submit" className="submit-button">Salvar</button>
                                            <button
                                                type="button"
                                                className="cancel-button"
                                                onClick={() => setShowCityForm(false)}
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
                    <div className="venues-list">
                        <div className="section-header with-tabs">
                            <button className="back-button" onClick={handleBackButton}>
                                Voltar para Cidades
                            </button>
                            <h2>
                                Locais em {cities.find(c => c.id === selectedCityId)?.name}
                            </h2>
                            <div className="header-actions">
                                <button
                                    className="view-tab active"
                                    onClick={handleViewVenues}
                                >
                                    Locais
                                </button>
                                <button
                                    className="view-tab"
                                    onClick={handleViewProfessionals}
                                >
                                    Profissionais
                                </button>
                                <button
                                    className="add-button"
                                    onClick={() => setShowVenueForm(true)}
                                >
                                    + Novo Local
                                </button>
                            </div>
                        </div>

                        {venues.length === 0 ? (
                            <p>Nenhum local encontrado. Adicione um novo local.</p>
                        ) : (
                            <div className="venues-grid">
                                {venues.map(venue => (
                                    <div key={venue.id} className="venue-card">
                                        <div className="venue-card-header">
                                            <h3>{venue.name}</h3>
                                            <button
                                                className={`favorite-toggle ${venue.isFavorite ? 'is-favorite' : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleFavorite(venue);
                                                }}
                                                aria-label={venue.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                                            >
                                                {venue.isFavorite ? '★' : '☆'}
                                            </button>
                                        </div>
                                        <p><strong>Endereço:</strong> {venue.address}</p>
                                        <p><strong>Telefone:</strong> {venue.phone}</p>
                                        <p><strong>Preço do Local:</strong> R$ {venue.venuePrice.toLocaleString('pt-BR')}</p>
                                        <p><strong>Preço da Comida:</strong> R$ {venue.foodPrice.toLocaleString('pt-BR')}</p>
                                        <p><strong>Preço da Bebida:</strong> R$ {venue.drinkPrice.toLocaleString('pt-BR')}</p>
                                        <p><strong>Total Estimado:</strong> R$ {(venue.venuePrice + venue.foodPrice + venue.drinkPrice).toLocaleString('pt-BR')}</p>
                                        <p><strong>Formatos:</strong> {venue.formats}</p>
                                        <p><strong>Parcelamento:</strong> {venue.installmentPlan}</p>
                                        {venue.pdfDocuments && venue.pdfDocuments.length > 0 && (
                                            <div className="pdf-links">
                                                <p><strong>Documentos:</strong></p>
                                                <ul className="pdf-list">
                                                    {venue.pdfDocuments.map(doc => (
                                                        <li key={doc.id}>
                                                            <a
                                                                href={doc.url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="pdf-link"
                                                            >
                                                                {doc.name}
                                                            </a>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        <div className="notes">
                                            <strong>Observações:</strong>
                                            <p>{venue.notes || "Nenhuma observação"}</p>
                                        </div>

                                        <div className="card-actions">
                                            <button
                                                className="edit-button"
                                                onClick={() => handleEditVenue(venue)}
                                            >
                                                Editar
                                            </button>
                                            <button
                                                className="delete-button"
                                                onClick={() => setConfirmDelete(`venue-${venue.id}`)}
                                            >
                                                Excluir
                                            </button>
                                        </div>

                                        {confirmDelete === `venue-${venue.id}` && (
                                            <div className="card-confirm-delete">
                                                <p>Tem certeza que deseja excluir este local?</p>
                                                <div className="card-confirm-buttons">
                                                    <button
                                                        className="card-confirm-yes"
                                                        onClick={() => handleDeleteVenue(venue.id!)}
                                                    >
                                                        Sim
                                                    </button>
                                                    <button
                                                        className="card-confirm-no"
                                                        onClick={() => setConfirmDelete(null)}
                                                    >
                                                        Não
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {showVenueForm && (
                            <div className="modal-overlay">
                                <div className="modal-content">
                                    <h3>{editingVenueId ? 'Editar Local' : 'Adicionar Novo Local'}</h3>
                                    <form onSubmit={handleVenueFormSubmit}>
                                        <div className="form-group">
                                            <label htmlFor="name">Nome:</label>
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                value={venueFormData.name}
                                                onChange={handleVenueFormChange}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="address">Endereço:</label>
                                            <input
                                                type="text"
                                                id="address"
                                                name="address"
                                                value={venueFormData.address}
                                                onChange={handleVenueFormChange}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="phone">Telefone:</label>
                                            <input
                                                type="text"
                                                id="phone"
                                                name="phone"
                                                value={venueFormData.phone}
                                                onChange={handleVenueFormChange}
                                            />
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label htmlFor="venuePrice">Preço do Local:</label>
                                                <input
                                                    type="number"
                                                    id="venuePrice"
                                                    name="venuePrice"
                                                    value={venueFormData.venuePrice}
                                                    onChange={handleVenueFormChange}
                                                    min="0"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor="foodPrice">Preço da Comida:</label>
                                                <input
                                                    type="number"
                                                    id="foodPrice"
                                                    name="foodPrice"
                                                    value={venueFormData.foodPrice}
                                                    onChange={handleVenueFormChange}
                                                    min="0"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor="drinkPrice">Preço da Bebida:</label>
                                                <input
                                                    type="number"
                                                    id="drinkPrice"
                                                    name="drinkPrice"
                                                    value={venueFormData.drinkPrice}
                                                    onChange={handleVenueFormChange}
                                                    min="0"
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="formats">Formatos:</label>
                                            <input
                                                type="text"
                                                id="formats"
                                                name="formats"
                                                value={venueFormData.formats}
                                                onChange={handleVenueFormChange}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="installmentPlan">Plano de Parcelamento:</label>
                                            <input
                                                type="text"
                                                id="installmentPlan"
                                                name="installmentPlan"
                                                value={venueFormData.installmentPlan}
                                                onChange={handleVenueFormChange}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="notes">Observações:</label>
                                            <textarea
                                                id="notes"
                                                name="notes"
                                                value={venueFormData.notes}
                                                onChange={handleVenueFormChange}
                                                rows={4}
                                            ></textarea>
                                        </div>
                                        <div className="form-group">
                                            <label>Orçamentos/Detalhes (PDFs):</label>
                                            <div className="file-upload-container">
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
                                                />
                                                {selectedFiles.length > 0 && (
                                                    <p className="file-selected">{selectedFiles.length} arquivo(s) selecionado(s)</p>
                                                )}
                                            </div>

                                            {venueFormData.pdfDocuments && venueFormData.pdfDocuments.length > 0 && (
                                                <div className="current-pdfs">
                                                    <p><strong>Documentos existentes:</strong></p>
                                                    <ul className="pdf-list">
                                                        {venueFormData.pdfDocuments.map(doc => (
                                                            <li key={doc.id} className="pdf-item">
                                                                <a href={doc.url} target="_blank" rel="noreferrer">{doc.name}</a>
                                                                <button
                                                                    type="button"
                                                                    className="delete-pdf-button"
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
                                            <div className="upload-indicator">
                                                <div className="upload-spinner"></div>
                                                Fazendo upload de {Object.keys(currentUploads).length} arquivo(s)...
                                            </div>
                                        )}
                                        <div className="form-buttons">
                                            <button type="submit" className="submit-button">
                                                {editingVenueId ? 'Atualizar' : 'Salvar'}
                                            </button>
                                            <button
                                                type="button"
                                                className="cancel-button"
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
                    <div className="professionals-list">
                        <div className="section-header with-tabs">
                            <button className="back-button" onClick={handleBackButton}>
                                Voltar para Cidades
                            </button>
                            <h2>
                                Profissionais em {cities.find(c => c.id === selectedCityId)?.name}
                            </h2>
                            <div className="header-actions">
                                <button
                                    className="view-tab"
                                    onClick={handleViewVenues}
                                >
                                    Locais
                                </button>
                                <button
                                    className="view-tab active"
                                    onClick={handleViewProfessionals}
                                >
                                    Profissionais
                                </button>
                                <button
                                    className="add-button"
                                    onClick={() => setShowProfessionalForm(true)}
                                >
                                    + Novo Profissional
                                </button>
                            </div>
                        </div>

                        {professionals.length === 0 ? (
                            <p>Nenhum profissional encontrado. Adicione um novo profissional.</p>
                        ) : (
                            <div className="professionals-grid">
                                {professionals.map(professional => (
                                    <div key={professional.id} className="professional-card">
                                        <div className="professional-card-header">
                                            <h3>{professional.name}</h3>
                                            <button
                                                className={`favorite-toggle ${professional.isFavorite ? 'is-favorite' : ''}`}
                                                onClick={() => toggleProfessionalFavorite(professional)}
                                                aria-label={professional.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                                            >
                                                {professional.isFavorite ? '★' : '☆'}
                                            </button>
                                        </div>
                                        <p>
                                            <strong>Tipo:</strong> {
                                                professionalTypes.find(t => t.id === professional.typeId)?.name || 'Não especificado'
                                            }
                                        </p>
                                        <p><strong>Preço:</strong> R$ {professional.price.toLocaleString('pt-BR')}</p>
                                        <p><strong>Opções de Pagamento:</strong> {professional.paymentOptions || 'Não especificado'}</p>
                                        <p><strong>Parcelamento:</strong> {professional.installmentPlan || 'Não especificado'}</p>
                                        {professional.notes && (
                                            <div className="notes">
                                                <strong>Observações:</strong>
                                                <p>{professional.notes}</p>
                                            </div>
                                        )}

                                        <button
                                            className="delete-button"
                                            onClick={() => setConfirmDelete(`professional-${professional.id}`)}
                                        >
                                            Excluir
                                        </button>

                                        {confirmDelete === `professional-${professional.id}` && (
                                            <div className="card-confirm-delete">
                                                <p>Tem certeza que deseja excluir este profissional?</p>
                                                <div className="card-confirm-buttons">
                                                    <button
                                                        className="card-confirm-yes"
                                                        onClick={() => handleDeleteProfessional(professional.id!)}
                                                    >
                                                        Sim
                                                    </button>
                                                    <button
                                                        className="card-confirm-no"
                                                        onClick={() => setConfirmDelete(null)}
                                                    >
                                                        Não
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {showProfessionalForm && (
                            <div className="modal-overlay">
                                <div className="modal-content">
                                    <h3>Adicionar Novo Profissional</h3>
                                    <form onSubmit={handleProfessionalFormSubmit}>
                                        <div className="form-group">
                                            <label htmlFor="name">Nome:</label>
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                value={professionalFormData.name}
                                                onChange={handleProfessionalFormChange}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="typeId">Tipo de Profissional:</label>
                                            <select
                                                id="typeId"
                                                name="typeId"
                                                value={professionalFormData.typeId}
                                                onChange={handleProfessionalFormChange}
                                                required
                                            >
                                                <option value="">Selecione um tipo</option>
                                                {professionalTypes.map(type => (
                                                    <option key={type.id} value={type.id}>
                                                        {type.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="price">Preço:</label>
                                            <input
                                                type="number"
                                                id="price"
                                                name="price"
                                                value={professionalFormData.price}
                                                onChange={handleProfessionalFormChange}
                                                min="0"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="paymentOptions">Opções de Pagamento:</label>
                                            <input
                                                type="text"
                                                id="paymentOptions"
                                                name="paymentOptions"
                                                value={professionalFormData.paymentOptions}
                                                onChange={handleProfessionalFormChange}
                                                placeholder="Ex: À vista com 10% de desconto, Parcelado sem juros, etc."
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="installmentPlan">Plano de Parcelamento:</label>
                                            <input
                                                type="text"
                                                id="installmentPlan"
                                                name="installmentPlan"
                                                value={professionalFormData.installmentPlan}
                                                onChange={handleProfessionalFormChange}
                                                placeholder="Ex: Em até 12x no cartão"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="notes">Observações sobre os serviços:</label>
                                            <textarea
                                                id="notes"
                                                name="notes"
                                                value={professionalFormData.notes}
                                                onChange={handleProfessionalFormChange}
                                                rows={4}
                                                placeholder="Inclui itens adicionais? Detalhes sobre o pacote? Outras informações relevantes?"
                                            ></textarea>
                                        </div>
                                        <div className="form-buttons">
                                            <button type="submit" className="submit-button">Salvar</button>
                                            <button
                                                type="button"
                                                className="cancel-button"
                                                onClick={() => setShowProfessionalForm(false)}
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
                    <div className="types-list">
                        <div className="section-header">
                            <button className="back-button" onClick={handleBackButton}>
                                Voltar para Cidades
                            </button>
                            <h2>Tipos de Profissionais</h2>
                            <button
                                className="add-button"
                                onClick={() => setShowTypeForm(true)}
                            >
                                + Novo Tipo
                            </button>
                        </div>

                        {professionalTypes.length === 0 ? (
                            <p>Nhum tipo encontrado. Adicione um novo tipo.</p>
                        ) : (
                            <div className="types-grid">
                                {professionalTypes.map(type => (
                                    <div key={type.id} className="type-card">
                                        <div className="type-card-content">
                                            <h3>{type.name}</h3>
                                        </div>
                                        <button
                                            className="edit-button"
                                            onClick={() => {
                                                setTypeFormData({ name: type.name });
                                                setEditingTypeId(type.id!);
                                                setShowTypeForm(true);
                                            }}
                                        >
                                            Editar
                                        </button>
                                        <button
                                            className="delete-button"
                                            onClick={() => setConfirmDelete(`type-${type.id}`)}
                                        >
                                            Excluir
                                        </button>

                                        {confirmDelete === `type-${type.id}` && (
                                            <div className="card-confirm-delete">
                                                <p>Tem certeza que deseja excluir este tipo?</p>
                                                <div className="card-confirm-buttons">
                                                    <button
                                                        className="card-confirm-yes"
                                                        onClick={() => handleDeleteProfessionalType(type.id!)}
                                                    >
                                                        Sim
                                                    </button>
                                                    <button
                                                        className="card-confirm-no"
                                                        onClick={() => setConfirmDelete(null)}
                                                    >
                                                        Não
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
                                <div className="modal-overlay">
                                    <div className="modal-content">
                                        <h3>{editingTypeId ? 'Editar Tipo de Profissional' : 'Adicionar Novo Tipo'}</h3>
                                        <form onSubmit={handleTypeFormSubmit}>
                                            <div className="form-group">
                                                <label htmlFor="name">Nome:</label>
                                                <input
                                                    type="text"
                                                    id="name"
                                                    name="name"
                                                    value={typeFormData.name}
                                                    onChange={(e) => setTypeFormData({ name: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="form-buttons">
                                                <button type="submit" className="submit-button">Salvar</button>
                                                <button
                                                    type="button"
                                                    className="cancel-button"
                                                    onClick={() => {
                                                        setShowTypeForm(false);
                                                        setEditingTypeId(null);
                                                        setTypeFormData({ name: '' });
                                                    }}
                                                >
                                                    Cancelar
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