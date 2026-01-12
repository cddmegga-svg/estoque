import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Product } from "@/types"

interface ProductComboboxProps {
    products: Product[]
    value: string
    onChange: (value: string) => void
    disabled?: boolean
}

export function ProductCombobox({ products, value, onChange, disabled }: ProductComboboxProps) {
    const [open, setOpen] = React.useState(false)

    // Find the selected product object to display its name
    const selectedProduct = products.find((product) => product.id === value)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal"
                    disabled={disabled}
                >
                    {selectedProduct ? (
                        <span className="truncate">
                            {selectedProduct.name}
                        </span>
                    ) : (
                        <span className="text-muted-foreground">Selecione ou busque o produto...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                    <CommandInput placeholder="Buscar por Nome ou EAN..." />
                    <CommandList>
                        <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                        <CommandGroup>
                            {products.map((product) => (
                                <CommandItem
                                    key={product.id}
                                    value={`${product.name} | ${product.ean}`} // Concatenate for search
                                    onSelect={() => {
                                        onChange(product.id)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === product.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-medium">{product.name}</span>
                                        <span className="text-xs text-muted-foreground">EAN: {product.ean}</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
