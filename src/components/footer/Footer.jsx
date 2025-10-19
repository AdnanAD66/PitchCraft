import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';

function Footer() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
        });
        return () => unsubscribe();
    }, []);

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    return (
        <footer className="bg-blue-700 px-6 py-4 mt-8 text-white">
            <div className="max-w-7xl mx-auto flex flex-row flex-wrap items-center justify-center gap-y-6 gap-x-12 text-center">
                <Link to="/" className="mr-4 block cursor-pointer py-1.5 text-base text-white font-semibold">
                    PitchCraft
                </Link>
                <ul className="flex flex-wrap items-center gap-y-2 gap-x-8">
                    <li>
                        <Link to="/create" className="text-white hover:text-blue-200 focus:text-blue-200 text-sm">
                            Create Pitch
                        </Link>
                    </li>
                    {user ? (
                        <>
                            <li>
                                <Link to="/dashboard" className="text-white hover:text-blue-200 focus:text-blue-200 text-sm">
                                    Dashboard
                                </Link>
                            </li>
                            <li>
                                <span className="text-sm text-blue-200">
                                    Welcome, {user.displayName || user.email}
                                </span>
                            </li>
                            <li>
                                <button
                                    onClick={handleSignOut}
                                    className="text-white hover:text-blue-200 focus:text-blue-200 text-sm bg-transparent border-none cursor-pointer"
                                >
                                    Sign Out
                                </button>
                            </li>
                        </>
                    ) : (
                        <>
                            <li>
                                <Link to="/login" className="text-white hover:text-blue-200 focus:text-blue-200 text-sm">
                                    Login
                                </Link>
                            </li>
                            <li>
                                <Link to="/signup" className="text-white hover:text-blue-200 focus:text-blue-200 text-sm">
                                    Sign Up
                                </Link>
                            </li>
                        </>
                    )}
                </ul>
            </div>
            <p className="block mb-4 text-sm text-center text-blue-200 md:mb-0 border-t border-blue-300 mt-4 pt-4 max-w-7xl mx-auto px-4">
                Copyright © 2024&nbsp;
                <a href="https://material-tailwind.com/" target="_blank" rel="noreferrer" className="text-white hover:text-blue-200">PitchCraft</a>.
            </p>
        </footer>
    );
}

export default Footer;
