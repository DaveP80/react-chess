import { useNavigate } from '@remix-run/react';
import React, { useContext, useEffect } from 'react'
import { GlobalContext } from '~/context/globalcontext';

export default function RouteHook() {
    const UserInfo = useContext(GlobalContext);
    const navigate = useNavigate();
    useEffect(() => {
      const availUser = UserInfo?.user.id;

      if (!availUser) {
        navigate("/login");
      } else {
        navigate("/")
      }
    
      return () => {
        true;
      }
    }, [])
    
    
  return null;
}
