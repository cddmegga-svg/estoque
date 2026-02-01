import * as React from "react";
import {
    Calculator,
    Calendar,
    CreditCard,
    Settings,
    Smile,
    User,
    LayoutDashboard,
    Package,
    ShoppingCart,
    FileBarChart,
    Truck,
    LogOut,
    PlusCircle,
    Search
} from "lucide-react";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command";
import { useAuth } from "@/hooks/useAuth";

interface CommandMenuProps {
    onNavigate: (page: string, params?: any) => void;
}

export function CommandMenu({ onNavigate }: CommandMenuProps) {
    const [open, setOpen] = React.useState(false);
    const { user, signOut } = useAuth();

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false);
        command();
    }, []);

    if (!user) return null;

    return (
        <>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="Digite um comando ou busca..." />
                <CommandList>
                    <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

                    <CommandGroup heading="Navegação Rápida">
                        <CommandItem onSelect={() => runCommand(() => onNavigate("dashboard"))}>
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            <span>Dashboard</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => onNavigate("sales"))}>
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            <span>Nova Venda / PDV</span>
                            <CommandShortcut>F1</CommandShortcut>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => onNavigate("products"))}>
                            <Package className="mr-2 h-4 w-4" />
                            <span>Produtos & Estoque</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => onNavigate("reports"))}>
                            <FileBarChart className="mr-2 h-4 w-4" />
                            <span>Relatórios</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => onNavigate("movements"))}>
                            <Truck className="mr-2 h-4 w-4" />
                            <span>Movimentações</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => onNavigate("customers"))}>
                            <User className="mr-2 h-4 w-4" />
                            <span>Clientes & CRM</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => onNavigate("admin"))}>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Administração</span>
                        </CommandItem>
                    </CommandGroup>

                    <CommandSeparator />

                    <CommandGroup heading="Ações">
                        <CommandItem onSelect={() => runCommand(() => onNavigate("products", { action: 'new' }))}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            <span>Cadastrar Produto</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => onNavigate("sales"))}>
                            <Search className="mr-2 h-4 w-4" />
                            <span>Consultar Preço</span>
                        </CommandItem>
                    </CommandGroup>

                    <CommandSeparator />

                    <CommandGroup heading="Conta">
                        <CommandItem onSelect={() => runCommand(() => signOut())}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Sair do Sistema</span>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    );
}
