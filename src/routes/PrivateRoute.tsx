import { Outlet } from 'react-router-dom';
import { useKeycloak } from "@react-keycloak/web";
import { useEffect } from 'react';
import { global } from '../global'
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

import ColonyEndpoint from '../colonies/colonies.js'

const PrivateRoute = () => {
    return <Outlet />;
};


export default PrivateRoute;
