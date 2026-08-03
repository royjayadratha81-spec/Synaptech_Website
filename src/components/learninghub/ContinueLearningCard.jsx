import Card from "../ui/Card";
import Button from "../ui/Button";

export default function ContinueLearningCard() {

    return (

        <Card className="p-8">

            <h2 className="text-2xl font-bold mb-6">

                Continue Learning

            </h2>

            <div className="space-y-4">

                <p className="text-gray-500">

                    Current Module

                </p>

                <h3 className="text-3xl font-bold">

                    Python Fundamentals

                </h3>

                <p className="text-gray-600">

                    Lesson 8 of 20

                </p>

                <div className="w-full bg-gray-200 rounded-full h-3">

                    <div
                        className="bg-blue-600 h-3 rounded-full"
                        style={{ width: "40%" }}
                    />

                </div>

                <div className="flex justify-between text-sm text-gray-500">

                    <span>40% Completed</span>

                    <span>12 Lessons Remaining</span>

                </div>

                <div className="pt-6">

                    <Button>

                        Resume Module →

                    </Button>

                </div>

            </div>

        </Card>

    );

}