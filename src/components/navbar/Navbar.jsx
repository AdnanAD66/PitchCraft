import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auth } from '../../firebase'
import { signOut, onAuthStateChanged } from 'firebase/auth'

function Navbar() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
    })
    return () => unsubscribe()
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      navigate('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

    return (
      <nav className="block px-4 py-2 mx-[25px] text-white bg-blue-700 shadow-md rounded-md lg:px-8 lg:py-3 mt-10">
        <div className="container flex flex-wrap items-center justify-between mx-auto text-white">
          <Link to="/"
            className="mr-4 block cursor-pointer py-1.5 text-base text-white font-semibold">
            PitchCraft
          </Link>
        <div className="hidden lg:block">
          <ul className="flex flex-col gap-2 mt-2 mb-4 lg:mb-0 lg:mt-0 lg:flex-row lg:items-center lg:gap-6">
            <li className="flex items-center p-1 text-sm gap-x-2 text-white">
              <Link to="/create" className="flex items-center hover:text-blue-200">
                Create Pitch
              </Link>
            </li>
            {user ? (
              <>
                <li className="flex items-center p-1 text-sm gap-x-2 text-white">
                  <Link to="/dashboard" className="flex items-center hover:text-blue-200">
                    Dashboard
                  </Link>
                </li>
                <li className="flex items-center p-1 text-sm gap-x-2 text-white">
                  <span className="text-sm text-blue-200">
                    Welcome, {user.displayName || user.email}
                  </span>
                </li>
                <li className="flex items-center p-1 text-sm gap-x-2 text-white">
                  <button 
                    onClick={handleSignOut}
                    className="flex items-center hover:text-blue-200 bg-transparent border-none cursor-pointer"
                  >
                    Sign Out
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="flex items-center p-1 text-sm gap-x-2 text-white">
                  <Link to="/login" className="flex items-center hover:text-blue-200">
                    Login
                  </Link>
                </li>
                <li className="flex items-center p-1 text-sm gap-x-2 text-white">
                  <Link to="/signup" className="flex items-center hover:text-blue-200">
                    Sign Up
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
        <button
          className="relative ml-auto h-6 max-h-[40px] w-6 max-w-[40px] select-none rounded-lg text-center align-middle text-xs font-medium uppercase text-inherit transition-all hover:bg-transparent focus:bg-transparent active:bg-transparent disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none lg:hidden"
          type="button">
          <span className="absolute transform -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </span>
        </button>
      </div>
    </nav>
  )
}

export default Navbar
