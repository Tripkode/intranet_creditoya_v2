"use client";

import SidebarLayout from "@/components/gadgets/sidebar/LayoutSidebar";
import { useRouter } from "next/navigation";
import { HiOutlineArrowUpRight } from "react-icons/hi2";
import { IoBugOutline } from "react-icons/io5";
import { LiaCloudSolid } from "react-icons/lia";
import { AiOutlineBlock } from "react-icons/ai";
import { BookText, GitPullRequestArrow } from "lucide-react";
import BackButton from "@/components/gadgets/backBtn";

function SupportPage() {
    const router = useRouter();

    return (
        <>
            <SidebarLayout>
                <div className="pt-20 p-4 sm:p-6 md:p-8 bg-gray-50 min-h-screen overflow-scroll">
                    <BackButton />

                    <header className="mb-8">
                        <h1 className="text-xl sm:text-2xl font-medium text-gray-800">Soporte Tecnico</h1>
                        <p className="text-gray-500 text-sm mt-1">Registro y seguimiento de errores, respuesta a reportes e implementación de futuras actualizaciones.</p>
                    </header>

                    <div className="space-y-3">
                        <div
                            onClick={() => router.push("/dashboard/soporte/error")}
                            className="flex border bg-gray-50 border-gray-100 hover:border-gray-200 p-4 rounded-md hover:shadow-sm cursor-pointer"
                        >
                            <div className="flex flex-row gap-3 grow">
                                <div className="grid place-content-center">
                                    <IoBugOutline size={50} className="drop-shadow-md text-gray-500" />
                                </div>
                                <div>
                                    <h1 className="font-bold text-black">Gestion de Errores</h1>
                                    <p className="text-sm font-thin text-gray-500">Visualiza errores en tiempo real o reportalos manualmente</p>
                                </div>
                            </div>
                            <div className="grid place-content-center">
                                <HiOutlineArrowUpRight className="text-gray-500" />
                            </div>
                        </div>

                        <div
                            onClick={() => router.push("/dashboard/soporte/sistema")}
                            className="flex border border-gray-100 hover:border-gray-200 p-4 rounded-md hover:shadow-sm cursor-pointer"
                        >
                            <div className="flex flex-row gap-3 grow">
                                <div className="grid place-content-center">
                                    <LiaCloudSolid size={50} className="drop-shadow-md text-gray-500" />
                                </div>
                                <div>
                                    <h1 className="font-bold text-gray-700">Estado del sistema</h1>
                                    <p className="text-sm font-thin text-gray-500">Consulta el estado actual de las aplicaciones y servicios.</p>
                                </div>
                            </div>
                            <div className="grid place-content-center">
                                <HiOutlineArrowUpRight className="text-gray-500 dr" />
                            </div>
                        </div>

                        <div
                            onClick={() => router.push("/dashboard/soporte/documentacion")}
                            className="flex border mt-6 bg-gray-50 border-gray-100 hover:border-gray-200 p-4 rounded-md hover:shadow-sm cursor-pointer"
                        >
                            <div className="flex flex-row gap-3 grow">
                                <div className="grid place-content-center">
                                    <BookText size={50} className="drop-shadow-md text-gray-500" />
                                </div>
                                <div>
                                    <h1 className="font-bold text-black">Guía</h1>
                                    <p className="text-sm font-thin text-gray-500">Documentación completa y Arquitectura Técnica</p>
                                </div>
                            </div>
                            <div className="grid place-content-center">
                                <HiOutlineArrowUpRight className="text-gray-500" />
                            </div>
                        </div>

                        <div
                            onClick={() => router.push("/dashboard/soporte/blockchain")}
                            className="flex border mt-6 bg-gray-50 border-gray-100 hover:border-gray-200 p-4 rounded-md hover:shadow-sm cursor-pointer"
                        >
                            <div className="flex flex-row gap-3 grow">
                                <div className="grid place-content-center">
                                    <AiOutlineBlock size={50} className="drop-shadow-md text-gray-500" />
                                </div>
                                <div>
                                    <h1 className="font-bold text-black">Procesos Criticos</h1>
                                    <p className="text-sm font-thin text-gray-500">Visualizacion de los procesos críticos registrados en la blockchain</p>
                                </div>
                            </div>
                            <div className="grid place-content-center">
                                <HiOutlineArrowUpRight className="text-gray-500" />
                            </div>
                        </div>

                        <div
                            onClick={() => router.push("/dashboard/soporte/actualizaciones")}
                            className="flex border mt-6 bg-gray-50 border-gray-100 hover:border-gray-200 p-4 rounded-md hover:shadow-sm cursor-pointer"
                        >
                            <div className="flex flex-row gap-3 grow">
                                <div className="grid place-content-center">
                                    <GitPullRequestArrow size={50} className="drop-shadow-md text-gray-500" />
                                </div>
                                <div>
                                    <h1 className="font-bold text-black">Proximas Actualizaciones</h1>
                                    <p className="text-sm font-thin text-gray-500">Revisa el estado de desarrollo de las nuevas funcionalidades y actualizaciones de tu aplicación.</p>
                                </div>
                            </div>
                            <div className="grid place-content-center">
                                <HiOutlineArrowUpRight className="text-gray-500" />
                            </div>
                        </div>
                    </div>
                </div>
            </SidebarLayout>
        </>
    )
}

export default SupportPage;