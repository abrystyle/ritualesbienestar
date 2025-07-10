'use client'

import { useState } from 'react'
import { Dialog, DialogPanel } from '@headlessui/react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'

const navigation = [
    { name: 'Home', href: '#' },
    { name: 'Blog', href: '/blog' },
    { name: 'About', href: '/about' },
    { name: 'Products', href: '/productos' },
    { name: 'Contact', href: '#' },
]
    
export default function HeroSection() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    return (
        <div className="bg-white">
            <header className="absolute inset-x-0 top-0 z-50">
                <div className="mx-auto max-w-7xl">
                    <div className="px-6 pt-6 lg:max-w-2xl lg:pr-0 lg:pl-8">
                        <nav aria-label="Global" className="flex items-center justify-between lg:justify-start">
                            <a href="#" className="-m-1.5 p-1.5">
                                <span className="sr-only">Mis rituales de bienestar</span>
                                <img
                                    alt="Mis rituales de bienestar"
                                    src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600"
                                    className="h-8 w-auto"
                                />
                            </a>
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(true)}
                                className="-m-2.5 rounded-md p-2.5 text-[#95A86B] lg:hidden"
                            >
                                <span className="sr-only">Open main menu</span>
                                <Bars3Icon aria-hidden="true" className="size-6" />
                            </button>
                            <div className="hidden lg:ml-4 lg:flex lg:gap-x-10">
                                {navigation.map((item) => (
                                    <a key={item.name} href={item.href} className="text-sm/6 font-semibold text-[#95A86B]">
                                        {item.name}
                                    </a>
                                ))}
                            </div>
                        </nav>
                    </div>
                </div>
                <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="lg:hidden">
                    <div className="fixed inset-0 z-50" />
                    <DialogPanel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white p-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
                        <div className="flex items-center justify-between">
                            <a href="#" className="-m-1.5 p-1.5">
                                <span className="sr-only">Mis rituales de bienestar</span>
                                <img
                                    alt=""
                                    src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600"
                                    className="h-8 w-auto"
                                />
                            </a>
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(false)}
                                className="-m-2.5 rounded-md p-2.5 text-gray-700"
                            >
                                <span className="sr-only">Close menu</span>
                                <XMarkIcon aria-hidden="true" className="size-6" />
                            </button>
                        </div>
                        <div className="mt-6 flow-root">
                            <div className="-my-6 divide-y divide-gray-500/10">
                                <div className="space-y-2 py-6">
                                    {navigation.map((item) => (
                                        <a
                                            key={item.name}
                                            href={item.href}
                                            className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-gray-900 hover:bg-gray-50"
                                        >
                                            {item.name}
                                        </a>
                                    ))}
                                </div>
                                <div className="py-6">
                                    <a
                                        href="#"
                                        className="-mx-3 block rounded-lg px-3 py-2.5 text-base/7 font-semibold text-gray-900 hover:bg-gray-50"
                                    >
                                        Log in
                                    </a>
                                </div>
                            </div>
                        </div>
                    </DialogPanel>
                </Dialog>
            </header>

            <div className="relative">
                <div className="mx-auto max-w-7xl">
                    <div className="relative z-10 pt-14 lg:w-full lg:max-w-2xl">
                        <svg
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                            aria-hidden="true"
                            className="absolute inset-y-0 right-8 hidden h-full w-80 translate-x-1/2 transform fill-white lg:block"
                        >
                            <polygon points="0,0 90,0 50,100 0,100" />
                        </svg>

                        <div className="relative px-6 py-16 sm:py-19 lg:px-8  lg:pr-0">
                            <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl">
                                <div className="hidden sm:mb-6 sm:flex">
                                    <div className="relative rounded-full px-3 py-1 text-sm/6 text-gray-500 ring-1 ring-gray-900/10 hover:ring-gray-900/20">
                                       Éste es mi último post.{' '}
                                        <a href="#" className="font-semibold whitespace-nowrap text-[#95A86B]">
                                            <span aria-hidden="true" className="absolute inset-0" />
                                            Leer post <span aria-hidden="true">&rarr;</span>
                                        </a>
                                    </div>
                                </div>
                                <h1 className="text-3xl font-semibold tracking-tight text-pretty text-[#95A86B] sm:text-6xl">
                                    Mis rituales de bienestar
                                </h1>
                                <p className="mt-8 text-lg font-medium text-pretty text-gray-500 sm:text-xl/8">
                                    Hola, soy Clara. Tengo 34 años y vivo en un pequeño pueblo de la costa, donde el mar y los olivos son mis compañeros de vida..
                                </p>
                                <div className="mt-10 flex items-center gap-x-6">
                                    <a
                                        href="#"
                                        className="rounded-md bg-[#95A86B] px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                                    >
                                        Ir al blog
                                    </a>
                                    <a href="#" className="text-sm/6 font-semibold text-[#505846]">
                                        saber más <span aria-hidden="true">→</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
                    <img
                        alt=""
                        src="/woman-garden.jpg"
                        className="aspect-3/2 object-cover lg:aspect-auto lg:size-full"
                    />
                </div>
            </div>
        </div>
    )
}
